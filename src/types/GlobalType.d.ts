//import MongoDBStorage from "../storage/mongodb/MongoDBStorage";

import MongoDBStorage from '../storage/mongodb/MongoDBStorage';
import Global = NodeJS.Global;

export interface TSGlobal extends Global {
  database: MongoDBStorage;
  appRoot: string;
  centralSystemJson: any;
  centralSystemSoap: any;
  userHashMapIDs: any;
  tenantHashMapIDs: any;
  Promise: any;
}

//declare const global: TSGlobal;
declare var global: TSGlobal;
export default global;

/*
declare module NodeJS {
  
  //import MongoDBStorage from '../storage/mongodb/MongoDBStorage';
  interface Global {
    appRoot: string;
    database:MongoDBStorage;
  }
}
import MongoDBStorage from '../storage/mongodb/MongoDBStorage';*/