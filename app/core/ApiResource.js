const Model = require('./Model');

/**
 * API Resource for NodeFlow
 * Transforms database models and collections consistently for API responses, modeled after NovaFlow.
 */
class ApiResource {
  constructor(resource) {
    this.resource = resource;
    this.relations = [];
  }

  static make(resource) {
    return new ApiResource(resource);
  }

  /**
   * Transforms input resource into clean payload object/array
   */
  transform() {
    if (this.resource === null || this.resource === undefined) {
      return null;
    }

    if (Array.isArray(this.resource)) {
      return this.resource.map(item => this.transformModel(item));
    }

    return this.transformModel(this.resource);
  }

  /**
   * Internal helper to serialize a model and append requested relation properties
   */
  transformModel(item) {
    if (item instanceof Model) {
      const data = item.toArray();

      this.relations.forEach(relation => {
        if (data[relation] === undefined) {
          data[relation] = item[relation] !== undefined ? item[relation] : null;
        }
      });

      return data;
    }

    if (typeof item.toJSON === 'function') {
      return item.toJSON();
    }

    return { ...item };
  }

  /**
   * Append requested relationship properties to serialized model outputs
   */
  include(...relations) {
    this.relations = [...this.relations, ...relations];
    return this;
  }

  /**
   * Serialize payload into a standard JSON string
   */
  toJson() {
    return JSON.stringify(this.transform());
  }

  static collection(resources) {
    return new ApiResource(resources);
  }

  static item(resource) {
    return new ApiResource(resource);
  }

  /**
   * Unified pagination response wrapper
   */
  static paginate(data, total, page, perPage) {
    const totalCount = parseInt(total) || 0;
    const limit = parseInt(perPage) || 20;
    const currentPage = parseInt(page) || 1;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      data: new ApiResource(data).transform(),
      pagination: {
        total: totalCount,
        per_page: limit,
        current_page: currentPage,
        total_pages: totalPages,
        has_more: currentPage < totalPages,
        has_previous: currentPage > 1
      }
    };
  }
}

module.exports = ApiResource;
