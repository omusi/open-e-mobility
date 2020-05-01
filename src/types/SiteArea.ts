import ChargingStation from '../types/ChargingStation';
import Site from '../types/Site';
import Address from './Address';
import ConnectorStats from './ConnectorStats';
import Consumption from './Consumption';
import CreatedUpdatedProps from './CreatedUpdatedProps';

export default interface SiteArea extends CreatedUpdatedProps {
  id: string;
  name: string;
  issuer: boolean;
  maximumPower: number;
  address: Address;
  image: string;
  siteID: string;
  site: Site;
  smartCharging: boolean;
  accessControl: boolean;
  chargingStations: ChargingStation[];
  availableChargers?: number;
  totalChargers?: number;
  availableConnectors?: number;
  totalConnectors?: number;
  connectorStats: ConnectorStats;
  values: SiteAreaConsumption[];
}

export interface SiteAreaConsumption {
  date: Date;
  instantPower: number;
  limitWatts: number;
}
