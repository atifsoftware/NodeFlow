/**
 * Pagination Helper for NodeFlow
 * Computes offset, boundaries, and outputs beautiful Bootstrap 5 pagination HTML.
 */
class Pagination {
  constructor(total, perPage = 20, currentPage = 1, baseUrl = '') {
    this._total = parseInt(total) || 0;
    this._perPage = parseInt(perPage) || 20;
    this._currentPage = parseInt(currentPage) || 1;
    this._baseUrl = baseUrl;
    this._limit = 5;
  }

  static make(total, perPage = 20, currentPage = 1, baseUrl = '') {
    return new Pagination(total, perPage, currentPage, baseUrl);
  }

  total() {
    return this._total;
  }

  perPage() {
    return this._perPage;
  }

  currentPage() {
    return this._currentPage;
  }

  totalPages() {
    return Math.ceil(this._total / this._perPage) || 1;
  }

  hasMore() {
    return this._currentPage < this.totalPages();
  }

  hasPrevious() {
    return this._currentPage > 1;
  }

  offset() {
    return (this._currentPage - 1) * this._perPage;
  }

  limit() {
    return this._perPage;
  }

  /**
   * Generates Bootstrap 5 CSS compatible pagination controls
   */
  render() {
    const totalPages = this.totalPages();
    if (totalPages <= 1) {
      return '';
    }

    let html = '<nav aria-label="Page navigation" class="my-4"><ul class="pagination pagination-rounded justify-content-center">';

    // --- First Page ---
    const firstDisabled = this._currentPage <= 1 ? 'disabled' : '';
    const firstUrl = this._currentPage > 1 ? this.getUrl(1) : '#';
    html += `<li class="page-item ${firstDisabled}">`;
    html += `<a class="page-link shadow-sm" href="${firstUrl}" title="First Page"><i class="fas fa-angle-double-left"></i></a>`;
    html += '</li>';

    // --- Previous Page ---
    const prevDisabled = !this.hasPrevious() ? 'disabled' : '';
    const prevUrl = this.hasPrevious() ? this.getUrl(this._currentPage - 1) : '#';
    html += `<li class="page-item ${prevDisabled}">`;
    html += `<a class="page-link shadow-sm" href="${prevUrl}" title="Previous Page"><i class="fas fa-angle-left"></i></a>`;
    html += '</li>';

    // --- Page Numbers with Intelligent Ellipsis ---
    const sidePages = 2; 
    const start = Math.max(1, this._currentPage - sidePages);
    const end = Math.min(totalPages, this._currentPage + sidePages);

    if (start > 1) {
      html += `<li class="page-item"><a class="page-link shadow-sm" href="${this.getUrl(1)}">1</a></li>`;
      if (start > 2) {
        html += '<li class="page-item disabled"><span class="page-link border-0">...</span></li>';
      }
    }

    for (let i = start; i <= end; i++) {
      const active = i === this._currentPage ? 'active' : '';
      html += `<li class="page-item ${active}">`;
      html += `<a class="page-link shadow-sm" href="${this.getUrl(i)}">${i}</a>`;
      html += '</li>';
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        html += '<li class="page-item disabled"><span class="page-link border-0">...</span></li>';
      }
      html += `<li class="page-item"><a class="page-link shadow-sm" href="${this.getUrl(totalPages)}">${totalPages}</a></li>`;
    }

    // --- Next Page ---
    const nextDisabled = !this.hasMore() ? 'disabled' : '';
    const nextUrl = this.hasMore() ? this.getUrl(this._currentPage + 1) : '#';
    html += `<li class="page-item ${nextDisabled}">`;
    html += `<a class="page-link shadow-sm" href="${nextUrl}" title="Next Page"><i class="fas fa-angle-right"></i></a>`;
    html += '</li>';

    // --- Last Page ---
    const lastDisabled = this._currentPage >= totalPages ? 'disabled' : '';
    const lastUrl = this._currentPage < totalPages ? this.getUrl(totalPages) : '#';
    html += `<li class="page-item ${lastDisabled}">`;
    html += `<a class="page-link shadow-sm" href="${lastUrl}" title="Last Page"><i class="fas fa-angle-double-right"></i></a>`;
    html += '</li>';

    html += '</ul></nav>';

    return html;
  }

  toArray() {
    return {
      total: this._total,
      per_page: this._perPage,
      current_page: this._currentPage,
      total_pages: this.totalPages(),
      has_more: this.hasMore(),
      has_previous: this.hasPrevious()
    };
  }

  getUrl(page) {
    const separator = this._baseUrl.includes('?') ? '&' : '?';
    return `${this._baseUrl}${separator}page=${page}`;
  }
}

module.exports = Pagination;
