export class AuditLog {
  constructor({ sink = (event) => process.stdout.write(JSON.stringify(event) + "\n") } = {}) {
    this.sink = sink;
  }

  record(type, fields = {}) {
    this.sink({ at: new Date().toISOString(), type, ...fields });
  }
}
