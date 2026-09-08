import { demoStore } from './demoStore'

type FilterOp =
  | { type: 'eq'; col: string; val: any }
  | { type: 'neq'; col: string; val: any }
  | { type: 'gt'; col: string; val: any }
  | { type: 'gte'; col: string; val: any }
  | { type: 'lt'; col: string; val: any }
  | { type: 'lte'; col: string; val: any }
  | { type: 'in'; col: string; vals: any[] }
  | { type: 'is'; col: string; val: any }
  | { type: 'like'; col: string; val: string }
  | { type: 'ilike'; col: string; val: string }

export class DemoQueryBuilder {
  private table: string
  private isHead: boolean = false
  private withCount: boolean = false
  private isSingle: boolean = false
  private filters: FilterOp[] = []
  private orClauses: string[] = []
  private orders: { col: string; ascending: boolean }[] = []
  private rangeBounds: { from: number; to: number } | null = null
  private limitCount: number | null = null
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

  neq(col: string, val: any) {
    this.filters.push({ type: 'neq', col, val })
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

  lt(col: string, val: any) {
    this.filters.push({ type: 'lt', col, val })
    return this
  }

  lte(col: string, val: any) {
    this.filters.push({ type: 'lte', col, val })
    return this
  }

  in(col: string, vals: any[]) {
    this.filters.push({ type: 'in', col, vals })
    return this
  }

  is(col: string, val: any) {
    this.filters.push({ type: 'is', col, val })
    return this
  }

  like(col: string, val: string) {
    this.filters.push({ type: 'like', col, val })
    return this
  }

  ilike(col: string, val: string) {
    this.filters.push({ type: 'ilike', col, val })
    return this
  }

  or(clause: string) {
    this.orClauses.push(clause)
    return this
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: options?.ascending ?? true })
    return this
  }

  range(from: number, to: number) {
    this.rangeBounds = { from, to }
    return this
  }

  limit(count: number) {
    this.limitCount = count
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

      // Apply standard filters
      let filtered = [...rows]
      for (const f of this.filters) {
        if (f.type === 'eq') {
          filtered = filtered.filter(row => row[f.col] === f.val)
        } else if (f.type === 'neq') {
          filtered = filtered.filter(row => row[f.col] !== f.val)
        } else if (f.type === 'gt') {
          filtered = filtered.filter(row => {
            const rVal = row[f.col]
            if (typeof rVal === 'number' || (!isNaN(Number(rVal)) && !isNaN(Number(f.val)))) {
              return Number(rVal) > Number(f.val)
            }
            return String(rVal) > String(f.val)
          })
        } else if (f.type === 'gte') {
          filtered = filtered.filter(row => {
            const rVal = row[f.col]
            if (typeof rVal === 'number' || (!isNaN(Number(rVal)) && !isNaN(Number(f.val)))) {
              return Number(rVal) >= Number(f.val)
            }
            return String(rVal) >= String(f.val)
          })
        } else if (f.type === 'lt') {
          filtered = filtered.filter(row => {
            const rVal = row[f.col]
            if (typeof rVal === 'number' || (!isNaN(Number(rVal)) && !isNaN(Number(f.val)))) {
              return Number(rVal) < Number(f.val)
            }
            return String(rVal) < String(f.val)
          })
        } else if (f.type === 'lte') {
          filtered = filtered.filter(row => {
            const rVal = row[f.col]
            if (typeof rVal === 'number' || (!isNaN(Number(rVal)) && !isNaN(Number(f.val)))) {
              return Number(rVal) <= Number(f.val)
            }
            return String(rVal) <= String(f.val)
          })
        } else if (f.type === 'in') {
          filtered = filtered.filter(row => f.vals.includes(row[f.col]))
        } else if (f.type === 'is') {
          filtered = filtered.filter(row => (f.val === null ? row[f.col] == null : row[f.col] === f.val))
        } else if (f.type === 'like') {
          const raw = String(f.val).replace(/^%|%$/g, '')
          filtered = filtered.filter(row => String(row[f.col] ?? '').includes(raw))
        } else if (f.type === 'ilike') {
          const raw = String(f.val).replace(/^%|%$/g, '').toLowerCase()
          filtered = filtered.filter(row => String(row[f.col] ?? '').toLowerCase().includes(raw))
        }
      }

      // Apply OR filters (PostgREST format: "col.op.val,col2.op.val")
      for (const clause of this.orClauses) {
        const parts = clause.split(',').map(s => s.trim())
        filtered = filtered.filter(row => {
          return parts.some(part => {
            const segments = part.split('.')
            if (segments.length >= 3) {
              const col = segments[0]
              const op = segments[1]
              const rawVal = segments.slice(2).join('.').replace(/^%|%$/g, '')
              const rowVal = String(row[col] ?? '')
              if (op === 'ilike') {
                return rowVal.toLowerCase().includes(rawVal.toLowerCase())
              }
              if (op === 'like') {
                return rowVal.includes(rawVal)
              }
              if (op === 'eq') {
                return rowVal.toLowerCase() === rawVal.toLowerCase()
              }
            }
            return false
          })
        })
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

      // Count of filtered results BEFORE range/limit slicing
      const totalCount = this.withCount ? filtered.length : null

      // Apply range slicing (pagination)
      if (this.rangeBounds) {
        filtered = filtered.slice(this.rangeBounds.from, this.rangeBounds.to + 1)
      }

      // Apply limit
      if (this.limitCount !== null) {
        filtered = filtered.slice(0, this.limitCount)
      }

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
