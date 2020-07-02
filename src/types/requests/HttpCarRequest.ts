import { CarType } from '../Car';
import HttpDatabaseRequest from './HttpDatabaseRequest';
import { UserCar } from '../User';

export interface HttpCarCatalogsRequest extends HttpDatabaseRequest {
  Search?: string;
  CarMaker?: string;
}

export interface HttpCarMakersRequest extends HttpDatabaseRequest {
  Search?: string;
}

export interface HttpCarCatalogImagesRequest extends HttpDatabaseRequest {
  CarID: number;
}

export interface HttpCarCatalogByIDRequest {
  ID: number;
}

export interface HttpCarByIDRequest {
  ID: string;
}

export interface HttpCarCreateRequest {
  vin: string;
  licensePlate: string;
  carCatalogID: number;
  forced?: boolean;
  type: CarType;
  id?: string;
  converterType?: string;
  usersAdded?: UserCar[];
}

export interface HttpCarUpdateRequest {
  vin: string;
  licensePlate: string;
  carCatalogID: number;
  forced?: boolean;
  type: CarType;
  id?: string;
  converterType?: string;
  usersRemoved?: UserCar[];
  usersUpserted?: UserCar[];
}

export interface HttpCarsRequest extends HttpDatabaseRequest {
  Search: string;
  CarMaker: string;
  WithUsers: boolean;
  UserID: string;
}

export interface HttpUsersCarsRequest extends HttpDatabaseRequest {
  Search: string;
  CarID: string;
}
