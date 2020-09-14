import _ from 'lodash';

interface Query {
  [name: string]: WeakMap<object, object[] | null>;
}

export default class MongoDbCache {
  public query: Query = {};
  private persistedFilters: object[] = [];

  public purgeQueryResult(query: string, filter: object): void {
    const map = this.query[query];
    if (!map) {
      return;
    }

    const persistedFilter = this.getPersistedFilter(filter);
    if (map.has(persistedFilter)) {
      console.log(`Purge cache for "${query}" ` + JSON.stringify(filter));
      map.delete(persistedFilter);
    }
  }

  public getQueryResult(query: string, filter: object): object[] | null | undefined {
    const map = this.query[query];

    if (!map) {
      return undefined;
    }

    const persistedFilter = this.getPersistedFilter(filter);

    if (map.has(persistedFilter)) {
      console.log(`Cache hit for "${query}" ` + JSON.stringify(filter));
      return map.get(persistedFilter);
    }

    return undefined;
  }

  public setQueryResult(query: string, filter: object, result: object[] | null): void {
    let weakMap = this.query[query];

    if (!weakMap) {
      this.query[query] = new WeakMap();
      weakMap = this.query[query];
    }

    weakMap.set(this.getPersistedFilter(filter), result);
    console.log(`Set cache for "${query}" ` + JSON.stringify(filter));
  }

  private getPersistedFilter(filter: object): object {
    for (const persistedFilter of this.persistedFilters) {
      if (_.isEqual(filter, persistedFilter)) {
        return persistedFilter;
      }
    }

    this.persistedFilters.push(filter);
    return filter;
  }
}
