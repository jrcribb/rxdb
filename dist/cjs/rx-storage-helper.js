"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = exports.INTERNAL_STORAGE_NAME = void 0;
exports.attachmentWriteDataToNormalData = attachmentWriteDataToNormalData;
exports.categorizeBulkWriteRows = categorizeBulkWriteRows;
exports.ensureRxStorageInstanceParamsAreCorrect = ensureRxStorageInstanceParamsAreCorrect;
exports.flatCloneDocWithMeta = flatCloneDocWithMeta;
exports.getAttachmentSize = getAttachmentSize;
exports.getChangedDocumentsSince = getChangedDocumentsSince;
exports.getChangedDocumentsSinceQuery = getChangedDocumentsSinceQuery;
exports.getSingleDocument = getSingleDocument;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.getWrittenDocumentsFromBulkWriteResponse = getWrittenDocumentsFromBulkWriteResponse;
exports.hasEncryption = hasEncryption;
exports.observeSingle = observeSingle;
exports.randomDelayStorage = randomDelayStorage;
exports.stackCheckpoints = stackCheckpoints;
exports.stripAttachmentsDataFromDocument = stripAttachmentsDataFromDocument;
exports.stripAttachmentsDataFromRow = stripAttachmentsDataFromRow;
exports.throwIfIsStorageWriteError = throwIfIsStorageWriteError;
exports.writeSingle = writeSingle;
var _overwritable = require("./overwritable.js");
var _rxError = require("./rx-error.js");
var _rxSchemaHelper = require("./rx-schema-helper.js");
var _index3 = require("./plugins/utils/index.js");
var _rxjs = require("rxjs");
var _rxQueryHelper = require("./rx-query-helper.js");
var _hooks = require("./hooks.js");
/**
 * Helper functions for accessing the RxStorage instances.
 */

var INTERNAL_STORAGE_NAME = exports.INTERNAL_STORAGE_NAME = '_rxdb_internal';
var RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';
async function getSingleDocument(storageInstance, documentId) {
  var results = await storageInstance.findDocumentsById([documentId], false);
  var doc = results[0];
  if (doc) {
    return doc;
  } else {
    return undefined;
  }
}

/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
async function writeSingle(instance, writeRow, context) {
  var writeResult = await instance.bulkWrite([writeRow], context);
  if (writeResult.error.length > 0) {
    var error = writeResult.error[0];
    throw error;
  } else {
    var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(instance.schema.primaryKey);
    var success = getWrittenDocumentsFromBulkWriteResponse(primaryPath, [writeRow], writeResult);
    var ret = success[0];
    return ret;
  }
}

/**
 * Observe the plain document data of a single document.
 * Do not forget to unsubscribe.
 */
function observeSingle(storageInstance, documentId) {
  var firstFindPromise = getSingleDocument(storageInstance, documentId);
  var ret = storageInstance.changeStream().pipe((0, _rxjs.map)(evBulk => evBulk.events.find(ev => ev.documentId === documentId)), (0, _rxjs.filter)(ev => !!ev), (0, _rxjs.map)(ev => Promise.resolve((0, _index3.ensureNotFalsy)(ev).documentData)), (0, _rxjs.startWith)(firstFindPromise), (0, _rxjs.switchMap)(v => v), (0, _rxjs.filter)(v => !!v));
  return ret;
}

/**
 * Checkpoints must be stackable over another.
 * This is required form some RxStorage implementations
 * like the sharding plugin, where a checkpoint only represents
 * the document state from some, but not all shards.
 */
function stackCheckpoints(checkpoints) {
  return Object.assign({}, ...checkpoints);
}
function throwIfIsStorageWriteError(collection, documentId, writeData, error) {
  if (error) {
    if (error.status === 409) {
      throw (0, _rxError.newRxError)('CONFLICT', {
        collection: collection.name,
        id: documentId,
        writeError: error,
        data: writeData
      });
    } else if (error.status === 422) {
      throw (0, _rxError.newRxError)('VD2', {
        collection: collection.name,
        id: documentId,
        writeError: error,
        data: writeData
      });
    } else {
      throw error;
    }
  }
}

/**
 * Analyzes a list of BulkWriteRows and determines
 * which documents must be inserted, updated or deleted
 * and which events must be emitted and which documents cause a conflict
 * and must not be written.
 * Used as helper inside of some RxStorage implementations.
 * @hotPath The performance of this function is critical
 */
function categorizeBulkWriteRows(storageInstance, primaryPath,
/**
 * Current state of the documents
 * inside of the storage. Used to determine
 * which writes cause conflicts.
 * This must be a Map for better performance.
 */
docsInDb,
/**
 * The write rows that are passed to
 * RxStorageInstance().bulkWrite().
 */
bulkWriteRows, context,
/**
 * Used by some storages for better performance.
 * For example when get-by-id and insert/update can run in parallel.
 */
onInsert, onUpdate) {
  var hasAttachments = !!storageInstance.schema.attachments;
  var bulkInsertDocs = [];
  var bulkUpdateDocs = [];
  var errors = [];
  var eventBulkId = (0, _index3.randomToken)(10);
  var eventBulk = {
    id: eventBulkId,
    events: [],
    checkpoint: null,
    context
  };
  var eventBulkEvents = eventBulk.events;
  var attachmentsAdd = [];
  var attachmentsRemove = [];
  var attachmentsUpdate = [];
  var hasDocsInDb = docsInDb.size > 0;
  var newestRow;

  /**
   * @performance is really important in this loop!
   */
  var rowAmount = bulkWriteRows.length;
  var _loop = function () {
    var writeRow = bulkWriteRows[rowId];

    // use these variables to have less property accesses
    var document = writeRow.document;
    var previous = writeRow.previous;
    var docId = document[primaryPath];
    var documentDeleted = document._deleted;
    var previousDeleted = previous && previous._deleted;
    var documentInDb = undefined;
    if (hasDocsInDb) {
      documentInDb = docsInDb.get(docId);
    }
    var attachmentError;
    if (!documentInDb) {
      /**
       * It is possible to insert already deleted documents,
       * this can happen on replication.
       */
      var insertedIsDeleted = documentDeleted ? true : false;
      if (hasAttachments) {
        Object.entries(document._attachments).forEach(([attachmentId, attachmentData]) => {
          if (!attachmentData.data) {
            attachmentError = {
              documentId: docId,
              isError: true,
              status: 510,
              writeRow,
              attachmentId
            };
            errors.push(attachmentError);
          } else {
            attachmentsAdd.push({
              documentId: docId,
              attachmentId,
              attachmentData: attachmentData,
              digest: attachmentData.digest
            });
          }
        });
      }
      if (!attachmentError) {
        if (hasAttachments) {
          bulkInsertDocs.push(stripAttachmentsDataFromRow(writeRow));
          if (onInsert) {
            onInsert(document);
          }
        } else {
          bulkInsertDocs.push(writeRow);
          if (onInsert) {
            onInsert(document);
          }
        }
        newestRow = writeRow;
      }
      if (!insertedIsDeleted) {
        var event = {
          documentId: docId,
          operation: 'INSERT',
          documentData: hasAttachments ? stripAttachmentsDataFromDocument(document) : document,
          previousDocumentData: hasAttachments && previous ? stripAttachmentsDataFromDocument(previous) : previous
        };
        eventBulkEvents.push(event);
      }
    } else {
      // update existing document
      var revInDb = documentInDb._rev;

      /**
       * Check for conflict
       */
      if (!previous || !!previous && revInDb !== previous._rev) {
        // is conflict error
        var err = {
          isError: true,
          status: 409,
          documentId: docId,
          writeRow: writeRow,
          documentInDb
        };
        errors.push(err);
        return 1; // continue
      }

      // handle attachments data

      var updatedRow = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow;
      if (hasAttachments) {
        if (documentDeleted) {
          /**
           * Deleted documents must have cleared all their attachments.
           */
          if (previous) {
            Object.keys(previous._attachments).forEach(attachmentId => {
              attachmentsRemove.push({
                documentId: docId,
                attachmentId,
                digest: (0, _index3.ensureNotFalsy)(previous)._attachments[attachmentId].digest
              });
            });
          }
        } else {
          // first check for errors
          Object.entries(document._attachments).find(([attachmentId, attachmentData]) => {
            var previousAttachmentData = previous ? previous._attachments[attachmentId] : undefined;
            if (!previousAttachmentData && !attachmentData.data) {
              attachmentError = {
                documentId: docId,
                documentInDb: documentInDb,
                isError: true,
                status: 510,
                writeRow,
                attachmentId
              };
            }
            return true;
          });
          if (!attachmentError) {
            Object.entries(document._attachments).forEach(([attachmentId, attachmentData]) => {
              var previousAttachmentData = previous ? previous._attachments[attachmentId] : undefined;
              if (!previousAttachmentData) {
                attachmentsAdd.push({
                  documentId: docId,
                  attachmentId,
                  attachmentData: attachmentData,
                  digest: attachmentData.digest
                });
              } else {
                var newDigest = updatedRow.document._attachments[attachmentId].digest;
                if (attachmentData.data &&
                /**
                 * Performance shortcut,
                 * do not update the attachment data if it did not change.
                 */
                previousAttachmentData.digest !== newDigest) {
                  attachmentsUpdate.push({
                    documentId: docId,
                    attachmentId,
                    attachmentData: attachmentData,
                    digest: attachmentData.digest
                  });
                }
              }
            });
          }
        }
      }
      if (attachmentError) {
        errors.push(attachmentError);
      } else {
        if (hasAttachments) {
          bulkUpdateDocs.push(stripAttachmentsDataFromRow(updatedRow));
          if (onUpdate) {
            onUpdate(document);
          }
        } else {
          bulkUpdateDocs.push(updatedRow);
          if (onUpdate) {
            onUpdate(document);
          }
        }
        newestRow = updatedRow;
      }
      var eventDocumentData = null;
      var previousEventDocumentData = null;
      var operation = null;
      if (previousDeleted && !documentDeleted) {
        operation = 'INSERT';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document;
      } else if (previous && !previousDeleted && !documentDeleted) {
        operation = 'UPDATE';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document;
        previousEventDocumentData = previous;
      } else if (documentDeleted) {
        operation = 'DELETE';
        eventDocumentData = (0, _index3.ensureNotFalsy)(document);
        previousEventDocumentData = previous;
      } else {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            writeRow
          }
        });
      }
      var _event = {
        documentId: docId,
        documentData: eventDocumentData,
        previousDocumentData: previousEventDocumentData,
        operation: operation
      };
      eventBulkEvents.push(_event);
    }
  };
  for (var rowId = 0; rowId < rowAmount; rowId++) {
    if (_loop()) continue;
  }
  return {
    bulkInsertDocs,
    bulkUpdateDocs,
    newestRow,
    errors,
    eventBulk,
    attachmentsAdd,
    attachmentsRemove,
    attachmentsUpdate
  };
}
function stripAttachmentsDataFromRow(writeRow) {
  return {
    previous: writeRow.previous,
    document: stripAttachmentsDataFromDocument(writeRow.document)
  };
}
function getAttachmentSize(attachmentBase64String) {
  return atob(attachmentBase64String).length;
}

/**
 * Used in custom RxStorage implementations.
 */
function attachmentWriteDataToNormalData(writeData) {
  var data = writeData.data;
  if (!data) {
    return writeData;
  }
  var ret = {
    length: getAttachmentSize(data),
    digest: writeData.digest,
    type: writeData.type
  };
  return ret;
}
function stripAttachmentsDataFromDocument(doc) {
  if (!doc._attachments || Object.keys(doc._attachments).length === 0) {
    return doc;
  }
  var useDoc = (0, _index3.flatClone)(doc);
  useDoc._attachments = {};
  Object.entries(doc._attachments).forEach(([attachmentId, attachmentData]) => {
    useDoc._attachments[attachmentId] = attachmentWriteDataToNormalData(attachmentData);
  });
  return useDoc;
}

/**
 * Flat clone the document data
 * and also the _meta field.
 * Used many times when we want to change the meta
 * during replication etc.
 */
function flatCloneDocWithMeta(doc) {
  return Object.assign({}, doc, {
    _meta: (0, _index3.flatClone)(doc._meta)
  });
}
/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
function getWrappedStorageInstance(database, storageInstance,
/**
 * The original RxJsonSchema
 * before it was mutated by hooks.
 */
rxJsonSchema) {
  _overwritable.overwritable.deepFreezeWhenDevMode(rxJsonSchema);
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(storageInstance.schema.primaryKey);
  var ret = {
    originalStorageInstance: storageInstance,
    schema: storageInstance.schema,
    internals: storageInstance.internals,
    collectionName: storageInstance.collectionName,
    databaseName: storageInstance.databaseName,
    options: storageInstance.options,
    async bulkWrite(rows, context) {
      var databaseToken = database.token;
      var toStorageWriteRows = new Array(rows.length);
      /**
       * Use the same timestamp for all docs of this rows-set.
       * This improves performance because calling Date.now() inside of the now() function
       * is too costly.
       */
      var time = (0, _index3.now)();
      for (var index = 0; index < rows.length; index++) {
        var writeRow = rows[index];
        var document = flatCloneDocWithMeta(writeRow.document);
        document._meta.lwt = time;

        /**
         * Yes we really want to set the revision here.
         * If you make a plugin that relies on having its own revision
         * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
         */
        var previous = writeRow.previous;
        document._rev = (0, _index3.createRevision)(databaseToken, previous);
        toStorageWriteRows[index] = {
          document,
          previous
        };
      }
      (0, _hooks.runPluginHooks)('preStorageWrite', {
        storageInstance: this.originalStorageInstance,
        rows: toStorageWriteRows
      });
      var writeResult = await database.lockedRun(() => storageInstance.bulkWrite(toStorageWriteRows, context));

      /**
       * The RxStorageInstance MUST NOT allow to insert already _deleted documents,
       * without sending the previous document version.
       * But for better developer experience, RxDB does allow to re-insert deleted documents.
       * We do this by automatically fixing the conflict errors for that case
       * by running another bulkWrite() and merging the results.
       * @link https://github.com/pubkey/rxdb/pull/3839
      */
      var useWriteResult = {
        error: []
      };
      BULK_WRITE_ROWS_BY_RESPONSE.set(useWriteResult, toStorageWriteRows);
      var reInsertErrors = writeResult.error.length === 0 ? [] : writeResult.error.filter(error => {
        if (error.status === 409 && !error.writeRow.previous && !error.writeRow.document._deleted && (0, _index3.ensureNotFalsy)(error.documentInDb)._deleted) {
          return true;
        }

        // add the "normal" errors to the parent error array.
        useWriteResult.error.push(error);
        return false;
      });
      if (reInsertErrors.length > 0) {
        var reInsertIds = new Set();
        var reInserts = reInsertErrors.map(error => {
          reInsertIds.add(error.documentId);
          return {
            previous: error.documentInDb,
            document: Object.assign({}, error.writeRow.document, {
              _rev: (0, _index3.createRevision)(database.token, error.documentInDb)
            })
          };
        });
        var subResult = await database.lockedRun(() => storageInstance.bulkWrite(reInserts, context));
        (0, _index3.appendToArray)(useWriteResult.error, subResult.error);
        var successArray = getWrittenDocumentsFromBulkWriteResponse(primaryPath, toStorageWriteRows, useWriteResult, reInsertIds);
        var subSuccess = getWrittenDocumentsFromBulkWriteResponse(primaryPath, reInserts, subResult);
        (0, _index3.appendToArray)(successArray, subSuccess);
        return useWriteResult;
      }
      return useWriteResult;
    },
    query(preparedQuery) {
      return database.lockedRun(() => storageInstance.query(preparedQuery));
    },
    count(preparedQuery) {
      return database.lockedRun(() => storageInstance.count(preparedQuery));
    },
    findDocumentsById(ids, deleted) {
      return database.lockedRun(() => storageInstance.findDocumentsById(ids, deleted));
    },
    getAttachmentData(documentId, attachmentId, digest) {
      return database.lockedRun(() => storageInstance.getAttachmentData(documentId, attachmentId, digest));
    },
    getChangedDocumentsSince: !storageInstance.getChangedDocumentsSince ? undefined : (limit, checkpoint) => {
      return database.lockedRun(() => storageInstance.getChangedDocumentsSince((0, _index3.ensureNotFalsy)(limit), checkpoint));
    },
    cleanup(minDeletedTime) {
      return database.lockedRun(() => storageInstance.cleanup(minDeletedTime));
    },
    remove() {
      database.storageInstances.delete(ret);
      return database.lockedRun(() => storageInstance.remove());
    },
    close() {
      database.storageInstances.delete(ret);
      return database.lockedRun(() => storageInstance.close());
    },
    changeStream() {
      return storageInstance.changeStream();
    }
  };
  database.storageInstances.add(ret);
  return ret;
}

/**
 * Each RxStorage implementation should
 * run this method at the first step of createStorageInstance()
 * to ensure that the configuration is correct.
 */
function ensureRxStorageInstanceParamsAreCorrect(params) {
  if (params.schema.keyCompression) {
    throw (0, _rxError.newRxError)('UT5', {
      args: {
        params
      }
    });
  }
  if (hasEncryption(params.schema)) {
    throw (0, _rxError.newRxError)('UT6', {
      args: {
        params
      }
    });
  }
  if (params.schema.attachments && params.schema.attachments.compression) {
    throw (0, _rxError.newRxError)('UT7', {
      args: {
        params
      }
    });
  }
}
function hasEncryption(jsonSchema) {
  if (!!jsonSchema.encrypted && jsonSchema.encrypted.length > 0 || jsonSchema.attachments && jsonSchema.attachments.encrypted) {
    return true;
  } else {
    return false;
  }
}
function getChangedDocumentsSinceQuery(storageInstance, limit, checkpoint) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(storageInstance.schema.primaryKey);
  var sinceLwt = checkpoint ? checkpoint.lwt : _index3.RX_META_LWT_MINIMUM;
  var sinceId = checkpoint ? checkpoint.id : '';
  return (0, _rxQueryHelper.normalizeMangoQuery)(storageInstance.schema, {
    selector: {
      $or: [{
        '_meta.lwt': {
          $gt: sinceLwt
        }
      }, {
        '_meta.lwt': {
          $eq: sinceLwt
        },
        [primaryPath]: {
          $gt: checkpoint ? sinceId : ''
        }
      }],
      // add this hint for better index usage
      '_meta.lwt': {
        $gte: sinceLwt
      }
    },
    sort: [{
      '_meta.lwt': 'asc'
    }, {
      [primaryPath]: 'asc'
    }],
    skip: 0,
    limit
    /**
     * DO NOT SET A SPECIFIC INDEX HERE!
     * The query might be modified by some plugin
     * before sending it to the storage.
     * We can be sure that in the end the query planner
     * will find the best index.
     */
    // index: ['_meta.lwt', primaryPath]
  });
}
async function getChangedDocumentsSince(storageInstance, limit, checkpoint) {
  if (storageInstance.getChangedDocumentsSince) {
    return storageInstance.getChangedDocumentsSince(limit, checkpoint);
  }
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(storageInstance.schema.primaryKey);
  var query = (0, _rxQueryHelper.prepareQuery)(storageInstance.schema, getChangedDocumentsSinceQuery(storageInstance, limit, checkpoint));
  var result = await storageInstance.query(query);
  var documents = result.documents;
  var lastDoc = (0, _index3.lastOfArray)(documents);
  return {
    documents: documents,
    checkpoint: lastDoc ? {
      id: lastDoc[primaryPath],
      lwt: lastDoc._meta.lwt
    } : checkpoint ? checkpoint : {
      id: '',
      lwt: 0
    }
  };
}
var BULK_WRITE_ROWS_BY_RESPONSE = new WeakMap();
var BULK_WRITE_SUCCESS_MAP = new WeakMap();

/**
 * For better performance, this is done only when accessed
 * because most of the time we do not need the results, only the errors.
 */
function getWrittenDocumentsFromBulkWriteResponse(primaryPath, writeRows, response, reInsertIds) {
  return (0, _index3.getFromMapOrCreate)(BULK_WRITE_SUCCESS_MAP, response, () => {
    var ret = [];
    var realWriteRows = BULK_WRITE_ROWS_BY_RESPONSE.get(response);
    if (!realWriteRows) {
      realWriteRows = writeRows;
    }
    if (response.error.length > 0 || reInsertIds) {
      var errorIds = reInsertIds ? reInsertIds : new Set();
      for (var index = 0; index < response.error.length; index++) {
        var error = response.error[index];
        errorIds.add(error.documentId);
      }
      for (var _index = 0; _index < realWriteRows.length; _index++) {
        var doc = realWriteRows[_index].document;
        if (!errorIds.has(doc[primaryPath])) {
          ret.push(stripAttachmentsDataFromDocument(doc));
        }
      }
    } else {
      // pre-set array size for better performance
      ret.length = writeRows.length - response.error.length;
      for (var _index2 = 0; _index2 < realWriteRows.length; _index2++) {
        var _doc = realWriteRows[_index2].document;
        ret[_index2] = stripAttachmentsDataFromDocument(_doc);
      }
    }
    return ret;
  });
}

/**
 * Wraps the storage and simluates
 * delays. Mostly used in tests.
 */
function randomDelayStorage(input) {
  /**
   * Ensure writes to a delay storage
   * are still correctly run in order.
   */
  var randomDelayStorageWriteQueue = _index3.PROMISE_RESOLVE_TRUE;
  var retStorage = {
    name: 'random-delay-' + input.storage.name,
    rxdbVersion: _index3.RXDB_VERSION,
    async createStorageInstance(params) {
      await (0, _index3.promiseWait)(input.delayTimeBefore());
      var storageInstance = await input.storage.createStorageInstance(params);
      await (0, _index3.promiseWait)(input.delayTimeAfter());
      return {
        databaseName: storageInstance.databaseName,
        internals: storageInstance.internals,
        options: storageInstance.options,
        schema: storageInstance.schema,
        collectionName: storageInstance.collectionName,
        bulkWrite(a, b) {
          randomDelayStorageWriteQueue = randomDelayStorageWriteQueue.then(async () => {
            await (0, _index3.promiseWait)(input.delayTimeBefore());
            var response = await storageInstance.bulkWrite(a, b);
            await (0, _index3.promiseWait)(input.delayTimeAfter());
            return response;
          });
          var ret = randomDelayStorageWriteQueue;
          return ret;
        },
        async findDocumentsById(a, b) {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.findDocumentsById(a, b);
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async query(a) {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.query(a);
          return ret;
        },
        async count(a) {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.count(a);
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async getAttachmentData(a, b, c) {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.getAttachmentData(a, b, c);
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        getChangedDocumentsSince: !storageInstance.getChangedDocumentsSince ? undefined : async (a, b) => {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await (0, _index3.ensureNotFalsy)(storageInstance.getChangedDocumentsSince)(a, b);
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        changeStream() {
          return storageInstance.changeStream();
        },
        async cleanup(a) {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.cleanup(a);
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async close() {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.close();
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async remove() {
          await (0, _index3.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.remove();
          await (0, _index3.promiseWait)(input.delayTimeAfter());
          return ret;
        }
      };
    }
  };
  return retStorage;
}
//# sourceMappingURL=rx-storage-helper.js.map