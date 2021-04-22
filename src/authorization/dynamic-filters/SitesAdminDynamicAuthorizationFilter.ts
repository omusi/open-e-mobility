import { AuthorizationFilter, DynamicAuthorizationDataSourceName, Entity } from '../../types/Authorization';

import DynamicAuthorizationFilter from '../DynamicAuthorizationFilter';
import SitesAdminDynamicAuthorizationDataSource from '../dynamic-data-source/SitesAdminDynamicAuthorizationDataSource';
import Utils from '../../utils/Utils';

export default class SitesAdminDynamicAuthorizationFilter extends DynamicAuthorizationFilter {
  public processFilter(authorizationFilters: AuthorizationFilter, extraFilters: Record<string, any>): void {
    // Get Site IDs
    const sitesAdminDataSource = this.getDataSource(
      DynamicAuthorizationDataSourceName.SITES_ADMIN) as SitesAdminDynamicAuthorizationDataSource;
    const { siteIDs } = sitesAdminDataSource.getData();
    // Check
    if (!Utils.isEmptyArray(siteIDs)) {
      // Force the filter
      authorizationFilters.filters.siteIDs = siteIDs;
      // Check if filter is provided
      if (Utils.objectHasProperty(extraFilters, 'SiteID') &&
          !Utils.isNullOrUndefined(extraFilters['SiteID'])) {
        const filteredSiteIDs: string[] = extraFilters['SiteID'].split('|');
        // Override
        authorizationFilters.filters.siteIDs = filteredSiteIDs.filter(
          (siteID) => authorizationFilters.filters.siteIDs.includes(siteID));
      }
    }
    if (!Utils.isEmptyArray(authorizationFilters.filters.siteIDs)) {
      authorizationFilters.authorized = true;
    }
  }

  public getApplicableEntities(): Entity[] {
    return [
      Entity.SITE
    ];
  }

  public getApplicableDataSources(): DynamicAuthorizationDataSourceName[] {
    return [
      DynamicAuthorizationDataSourceName.SITES_ADMIN
    ];
  }
}
