import _ from 'lodash';

interface Query {
  [name: string]: WeakMap<object, object[]>;
}

export default class MongoDbCache {
  public query: Query = {};
  private persistedFilters: object[] = [];

  public getQueryResult(query: string, filter: object): object[] | undefined {
    const map = this.query[query];

    if (!map) {
      return undefined;
    }

    const persistedFilter = this.getPersistedFilter(filter);

    if (map.has(persistedFilter)) {
      console.log(`Cache hit for "${query}" ` + JSON.stringify(filter));
      return map.get(persistedFilter);
    }
  }

  public setQueryResult(query: string, filter: object, result: object[]): void {
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
