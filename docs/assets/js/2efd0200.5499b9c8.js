"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[4132],{1780:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>c,default:()=>h,frontMatter:()=>i,metadata:()=>s,toc:()=>p});const s=JSON.parse('{"id":"tutorials/typescript","title":"TypeScript Setup","description":"Use RxDB with TypeScript to define typed schemas, create typed collections, and build fully typed ORM methods. A quick step-by-step guide.","source":"@site/docs/tutorials/typescript.md","sourceDirName":"tutorials","slug":"/tutorials/typescript.html","permalink":"/tutorials/typescript.html","draft":false,"unlisted":false,"tags":[],"version":"current","frontMatter":{"title":"TypeScript Setup","slug":"typescript.html","description":"Use RxDB with TypeScript to define typed schemas, create typed collections, and build fully typed ORM methods. A quick step-by-step guide."},"sidebar":"tutorialSidebar","previous":{"title":"Development Mode","permalink":"/dev-mode.html"},"next":{"title":"RxDatabase","permalink":"/rx-database.html"}}');var o=n(4848),r=n(8453),a=n(7580);const i={title:"TypeScript Setup",slug:"typescript.html",description:"Use RxDB with TypeScript to define typed schemas, create typed collections, and build fully typed ORM methods. A quick step-by-step guide."},c="Using RxDB with TypeScript",l={},p=[{value:"Declare the types",id:"declare-the-types",level:2},{value:"Create the base document type",id:"create-the-base-document-type",level:2},{value:"Types for the ORM methods",id:"types-for-the-orm-methods",level:2},{value:"Create RxDocument Type",id:"create-rxdocument-type",level:2},{value:"Create RxCollection Type",id:"create-rxcollection-type",level:2},{value:"Create RxDatabase Type",id:"create-rxdatabase-type",level:2},{value:"Using the types",id:"using-the-types",level:2},{value:"Known Problems",id:"known-problems",level:2}];function d(e){const t={a:"a",code:"code",h1:"h1",h2:"h2",header:"header",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,r.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(t.header,{children:(0,o.jsx)(t.h1,{id:"using-rxdb-with-typescript",children:"Using RxDB with TypeScript"})}),"\n",(0,o.jsx)(t.p,{children:"In this tutorial you will learn how to use RxDB with TypeScript.\nWe will create a basic database with one collection and several ORM-methods, fully typed!"}),"\n",(0,o.jsx)(t.p,{children:"RxDB directly comes with its typings and you do not have to install anything else, however the latest version of RxDB requires that you are using Typescript v3.8 or newer.\nOur way to go is"}),"\n",(0,o.jsxs)(t.ul,{children:["\n",(0,o.jsx)(t.li,{children:"First define what the documents look like"}),"\n",(0,o.jsx)(t.li,{children:"Then define what the collections look like"}),"\n",(0,o.jsx)(t.li,{children:"Then define what the database looks like"}),"\n"]}),"\n",(0,o.jsxs)(a.g,{children:[(0,o.jsx)(t.h2,{id:"declare-the-types",children:"Declare the types"}),(0,o.jsx)(t.p,{children:"First you import the types from RxDB."}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"import {\n    createRxDatabase,\n    RxDatabase,\n    RxCollection,\n    RxJsonSchema,\n    RxDocument,\n} from 'rxdb/plugins/core';\n"})}),(0,o.jsx)(t.h2,{id:"create-the-base-document-type",children:"Create the base document type"}),(0,o.jsx)(t.p,{children:"First we have to define the TypeScript type of the documents of a collection:"}),(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.strong,{children:"Option A"}),": Create the document type from the schema"]}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"import {\n    toTypedRxJsonSchema,\n    ExtractDocumentTypeFromTypedRxJsonSchema,\n    RxJsonSchema\n} from 'rxdb';\nexport const heroSchemaLiteral = {\n    title: 'hero schema',\n    description: 'describes a human being',\n    version: 0,\n    keyCompression: true,\n    primaryKey: 'passportId',\n    type: 'object',\n    properties: {\n        passportId: {\n            type: 'string',\n            maxLength: 100 // <- the primary key must have set maxLength\n        },\n        firstName: {\n            type: 'string'\n        },\n        lastName: {\n            type: 'string'\n        },\n        age: {\n            type: 'integer'\n        }\n    },\n    required: ['firstName', 'lastName', 'passportId'],\n    indexes: ['firstName']\n} as const; // <- It is important to set 'as const' to preserve the literal type\nconst schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral);\n\n// aggregate the document type from the schema\nexport type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;\n\n// create the typed RxJsonSchema from the literal typed object.\nexport const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral;\n"})}),(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.strong,{children:"Option B"}),": Manually type the document type"]}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"export type HeroDocType = {\n    passportId: string;\n    firstName: string;\n    lastName: string;\n    age?: number; // optional\n};\n"})}),(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.strong,{children:"Option C"}),": Generate the document type from schema during build time"]}),(0,o.jsxs)(t.p,{children:["If your schema is in a ",(0,o.jsx)(t.code,{children:".json"})," file or generated from somewhere else, you might generate the typings with the ",(0,o.jsx)(t.a,{href:"https://www.npmjs.com/package/json-schema-to-typescript",children:"json-schema-to-typescript"})," module."]}),(0,o.jsx)(t.h2,{id:"types-for-the-orm-methods",children:"Types for the ORM methods"}),(0,o.jsx)(t.p,{children:"We also add some ORM-methods for the document."}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"export type HeroDocMethods = {\n    scream: (v: string) => string;\n};\n"})}),(0,o.jsx)(t.h2,{id:"create-rxdocument-type",children:"Create RxDocument Type"}),(0,o.jsx)(t.p,{children:"We can merge these into our HeroDocument."}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"export type HeroDocument = RxDocument<HeroDocType, HeroDocMethods>;\n"})}),(0,o.jsx)(t.h2,{id:"create-rxcollection-type",children:"Create RxCollection Type"}),(0,o.jsx)(t.p,{children:"Now we can define type for the collection which contains the documents."}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"\n// we declare one static ORM-method for the collection\nexport type HeroCollectionMethods = {\n    countAllDocuments: () => Promise<number>;\n}\n\n// and then merge all our types\nexport type HeroCollection = RxCollection<\n    HeroDocType,\n    HeroDocMethods,\n    HeroCollectionMethods\n>;\n"})}),(0,o.jsx)(t.h2,{id:"create-rxdatabase-type",children:"Create RxDatabase Type"}),(0,o.jsx)(t.p,{children:"Before we can define the database, we make a helper-type which contains all collections of it."}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"export type MyDatabaseCollections = {\n    heroes: HeroCollection\n}\n"})}),(0,o.jsx)(t.p,{children:"Now the database."}),(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"export type MyDatabase = RxDatabase<MyDatabaseCollections>;\n"})})]}),"\n",(0,o.jsx)(t.h2,{id:"using-the-types",children:"Using the types"}),"\n",(0,o.jsx)(t.p,{children:"Now that we have declare all our types, we can use them."}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-typescript",children:"\n/**\n * create database and collections\n */\nconst myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({\n    name: 'mydb',\n    storage: getRxStorageDexie()\n});\n\nconst heroSchema: RxJsonSchema<HeroDocType> = {\n    title: 'human schema',\n    description: 'describes a human being',\n    version: 0,\n    keyCompression: true,\n    primaryKey: 'passportId',\n    type: 'object',\n    properties: {\n        passportId: {\n            type: 'string'\n        },\n        firstName: {\n            type: 'string'\n        },\n        lastName: {\n            type: 'string'\n        },\n        age: {\n            type: 'integer'\n        }\n    },\n    required: ['passportId', 'firstName', 'lastName']\n};\n\nconst heroDocMethods: HeroDocMethods = {\n    scream: function(this: HeroDocument, what: string) {\n        return this.firstName + ' screams: ' + what.toUpperCase();\n    }\n};\n\nconst heroCollectionMethods: HeroCollectionMethods = {\n    countAllDocuments: async function(this: HeroCollection) {\n        const allDocs = await this.find().exec();\n        return allDocs.length;\n    }\n};\n\nawait myDatabase.addCollections({\n    heroes: {\n        schema: heroSchema,\n        methods: heroDocMethods,\n        statics: heroCollectionMethods\n    }\n});\n\n// add a postInsert-hook\nmyDatabase.heroes.postInsert(\n    function myPostInsertHook(\n        this: HeroCollection, // own collection is bound to the scope\n        docData: HeroDocType, // documents data\n        doc: HeroDocument // RxDocument\n    ) {\n        console.log('insert to ' + this.name + '-collection: ' + doc.firstName);\n    },\n    false // not async\n);\n\n/**\n * use the database\n */\n\n// insert a document\nconst hero: HeroDocument = await myDatabase.heroes.insert({\n    passportId: 'myId',\n    firstName: 'piotr',\n    lastName: 'potter',\n    age: 5\n});\n\n// access a property\nconsole.log(hero.firstName);\n\n// use a orm method\nhero.scream('AAH!');\n\n// use a static orm method from the collection\nconst amount: number = await myDatabase.heroes.countAllDocuments();\nconsole.log(amount);\n\n\n/**\n * clean up\n */\nmyDatabase.close();\n"})}),"\n",(0,o.jsx)(t.h2,{id:"known-problems",children:"Known Problems"}),"\n",(0,o.jsxs)(t.p,{children:["RxDB uses the ",(0,o.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef",children:"WeakRef API"}),". If your typescript bundler throws the error ",(0,o.jsx)(t.code,{children:"TS2304: Cannot find name 'WeakRef'"}),", you have to add ",(0,o.jsx)(t.code,{children:"ES2021.WeakRef"})," to ",(0,o.jsx)(t.code,{children:"compilerOptions.lib"})," in your ",(0,o.jsx)(t.code,{children:"tsconfig.json"}),"."]}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-json",children:'{\n    "compilerOptions": {\n        "lib": ["ES2020", "ES2021.WeakRef"]\n    }\n}\n'})})]})}function h(e={}){const{wrapper:t}={...(0,r.R)(),...e.components};return t?(0,o.jsx)(t,{...e,children:(0,o.jsx)(d,{...e})}):d(e)}},7580:(e,t,n)=>{n.d(t,{g:()=>o});var s=n(4848);function o(e){const t=[];let n=null;return e.children.forEach((e=>{e.props.id?(n&&t.push(n),n={headline:e,paragraphs:[]}):n&&n.paragraphs.push(e)})),n&&t.push(n),(0,s.jsx)("div",{style:r.stepsContainer,children:t.map(((e,t)=>(0,s.jsxs)("div",{style:r.stepWrapper,children:[(0,s.jsxs)("div",{style:r.stepIndicator,children:[(0,s.jsxs)("div",{style:r.stepNumber,children:[t+1,"."]}),(0,s.jsx)("div",{style:r.verticalLine})]}),(0,s.jsxs)("div",{style:r.stepContent,children:[(0,s.jsx)("div",{children:e.headline}),e.paragraphs.map(((e,t)=>(0,s.jsx)("div",{style:r.item,children:e},t)))]})]},t)))})}const r={stepsContainer:{display:"flex",flexDirection:"column"},stepWrapper:{display:"flex",alignItems:"stretch",marginBottom:"1rem",position:"relative",minWidth:0},stepIndicator:{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",width:"32px",marginRight:"1rem",minWidth:0},stepNumber:{width:"32px",height:"32px",borderRadius:"50%",backgroundColor:"var(--color-middle)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"},verticalLine:{position:"absolute",top:"32px",bottom:"0",left:"50%",width:"1px",background:"linear-gradient(to bottom, var(--color-middle) 0%, var(--color-middle) 80%, rgba(0,0,0,0) 100%)",transform:"translateX(-50%)"},stepContent:{flex:1,minWidth:0,overflowWrap:"break-word"},item:{marginTop:"0.5rem"}}},8453:(e,t,n)=>{n.d(t,{R:()=>a,x:()=>i});var s=n(6540);const o={},r=s.createContext(o);function a(e){const t=s.useContext(r);return s.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function i(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:a(e.components),s.createElement(r.Provider,{value:t},e.children)}}}]);