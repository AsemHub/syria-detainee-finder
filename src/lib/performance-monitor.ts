interface SearchMetrics {
  startTime?: number
  endTime?: number
  duration?: number
  success: boolean
  errorType?: string
}

interface PerformanceReport {
  duration: number
  success: boolean
  errorType?: string
  searchMetrics: {
    averageDuration: number
    successRate: number
    errorRate: number
  }
}

export class SearchPerformanceMonitor {
  private currentSearch: SearchMetrics
  private searchHistory: SearchMetrics[]
  private maxHistorySize: number

  constructor(maxHistorySize = 100) {
    this.currentSearch = { success: false }
    this.searchHistory = []
    this.maxHistorySize = maxHistorySize
  }

  startSearch() {
    this.currentSearch = {
      startTime: Date.now(),
      success: false
    }
  }

  endSearch() {
    if (!this.currentSearch.startTime) return

    this.currentSearch.endTime = Date.now()
    this.currentSearch.duration = this.currentSearch.endTime - this.currentSearch.startTime
    this.currentSearch.success = true

    this.addToHistory(this.currentSearch)
  }

  recordError(type: string) {
    this.currentSearch.success = false
    this.currentSearch.errorType = type
    
    if (this.currentSearch.startTime) {
      this.currentSearch.endTime = Date.now()
      this.currentSearch.duration = this.currentSearch.endTime - this.currentSearch.startTime
    }

    this.addToHistory(this.currentSearch)
  }

  private addToHistory(metrics: SearchMetrics) {
    this.searchHistory.push({ ...metrics })
    
    // Keep history size in check
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory.shift()
    }
  }

  generateReport(): PerformanceReport {
    const completedSearches = this.searchHistory.filter(s => s.duration !== undefined)
    const successfulSearches = completedSearches.filter(s => s.success)
    
    const averageDuration = completedSearches.length > 0
      ? completedSearches.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSearches.length
      : 0

    return {
      duration: this.currentSearch.duration || 0,
      success: this.currentSearch.success,
      errorType: this.currentSearch.errorType,
      searchMetrics: {
        averageDuration,
        successRate: completedSearches.length > 0
          ? (successfulSearches.length / completedSearches.length) * 100
          : 0,
        errorRate: completedSearches.length > 0
          ? ((completedSearches.length - successfulSearches.length) / completedSearches.length) * 100
          : 0
      }
    }
  }
}
