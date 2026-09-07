import { demoStore } from './demoStore'

type FilterOp =
  | { type: 'eq'; col: string; val: any }
  | { type: 'gt'; col: string; val: any }
  | { type: 'gte'; col: string; val: any }
  | { type: 'in'; col: string; vals: any[] }

export class DemoQueryBuilder {
  private table: string
  private isHead: boolean = false
  private withCount: boolean = false
  private isSingle: boolean = false
  private filters: FilterOp[] = []
  private orders: { col: string; ascending: boolean }[] = []
  private mutationType: 'insert' | 'update' | 'delete' | null = null
  private mutationPayload: any = null

  constructor(table: string) {
    this.table = table
  }

  select(_columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (options?.head) this.isHead = true
    if (options?.count) this.withCount = true
    return this
  }

  eq(col: string, val: any) {
    this.filters.push({ type: 'eq', col, val })
    return this
  }

  gt(col: string, val: any) {
    this.filters.push({ type: 'gt', col, val })
    return this
  }

  gte(col: string, val: any) {
    this.filters.push({ type: 'gte', col, val })
    return this
  }

  in(col: string, vals: any[]) {
    this.filters.push({ type: 'in', col, vals })
    return this
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: options?.ascending ?? true })
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(payload: any) {
    this.mutationType = 'insert'
    this.mutationPayload = payload
    return this
  }

  update(payload: any) {
    this.mutationType = 'update'
    this.mutationPayload = payload
    return this
  }

  delete() {
    this.mutationType = 'delete'
    return this
  }

  async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      // Handle mutations
      if (this.mutationType === 'insert') {
        const isArray = Array.isArray(this.mutationPayload)
        const items = isArray ? this.mutationPayload : [this.mutationPayload]
        let result: any = []

        for (const item of items) {
          if (this.table === 'customers') {
            result.push(demoStore.insertCustomer(item))
          } else if (this.table === 'classes') {
            result.push(demoStore.insertClass(item))
          } else if (this.table === 'payments') {
            result.push(demoStore.insertPayment(item))
          }
        }

        return { data: isArray ? result : result[0], error: null }
      }

      if (this.mutationType === 'update') {
        const idFilter = this.filters.find(f => f.type === 'eq' && f.col === 'id')
        const id = idFilter ? (idFilter as any).val : null
        let result: any = null

        if (id) {
          if (this.table === 'customers') {
            result = demoStore.updateCustomer(id, this.mutationPayload)
          } else if (this.table === 'classes') {
            result = demoStore.updateClass(id, this.mutationPayload)
          }
        }
        return { data: result, error: null }
      }

      if (this.mutationType === 'delete') {
        const idFilter = this.filters.find(f => f.type === 'eq' && f.col === 'id')
        const id = idFilter ? (idFilter as any).val : null
        if (id && this.table === 'classes') {
          demoStore.deleteClass(id)
        }
        return { data: null, error: null }
      }

      // Handle queries
      let rows: any[] = []
      if (this.table === 'customers') {
        rows = demoStore.getCustomers()
      } else if (this.table === 'classes') {
        const customers = demoStore.getCustomers()
        const summaries = demoStore.getSummary()
        rows = demoStore.getClasses().map(cls => {
          const cust = customers.find(c => c.id === cls.customer_id)
          const sum = summaries.find(s => s.customer_id === cls.customer_id)
          return {
            ...cls,
            customers: cust
              ? {
                  id: cust.id,
                  full_name: cust.full_name,
                  phone_number: cust.phone_number,
                  package_classes: cust.package_classes,
                  location: cust.location,
                }
              : null,
            customer_summary: sum
              ? {
                  classes_completed: sum.classes_completed,
                  payment_status: sum.payment_status,
                  amount_pending: sum.amount_pending,
                }
              : null,
          }
        })
      } else if (this.table === 'payments') {
        rows = demoStore.getPayments()
      } else if (this.table === 'customer_summary') {
        rows = demoStore.getSummary()
      }

      // Apply filters
      let filtered = [...rows]
      for (const f of this.filters) {
        if (f.type === 'eq') {
          filtered = filtered.filter(row => row[f.col] === f.val)
        } else if (f.type === 'gt') {
          filtered = filtered.filter(row => Number(row[f.col]) > Number(f.val))
        } else if (f.type === 'gte') {
          filtered = filtered.filter(row => String(row[f.col]) >= String(f.val))
        } else if (f.type === 'in') {
          filtered = filtered.filter(row => f.vals.includes(row[f.col]))
        }
      }

      // Apply ordering
      for (const ord of this.orders) {
        filtered.sort((a, b) => {
          const valA = a[ord.col] ?? ''
          const valB = b[ord.col] ?? ''
          if (valA < valB) return ord.ascending ? -1 : 1
          if (valA > valB) return ord.ascending ? 1 : -1
          return 0
        })
      }

      const totalCount = this.withCount ? filtered.length : null

      if (this.isHead) {
        return { data: null, error: null, count: totalCount }
      }

      if (this.isSingle) {
        return { data: filtered[0] ?? null, error: null, count: totalCount }
      }

      return { data: filtered, error: null, count: totalCount }
    } catch (err: any) {
      return { data: null, error: { message: err?.message || 'Error executing demo query' } }
    }
  }

  // Support thenable for Promise chaining / await
  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    return this.execute().then(resolve, reject)
  }
}
