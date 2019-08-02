module.exports = {
  myService: {
    port: {
      doc: 'The API port',
      format: 'port',
      default: 3000
    },
    public_url: {
      doc: 'The public url',
      format: 'url',
      default: `http://localhost`
    }
  },
  myOtherService: {
    identity: {
      doc: 'The identity name',
      format: String,
      default: 'John'
    }
  }
}
