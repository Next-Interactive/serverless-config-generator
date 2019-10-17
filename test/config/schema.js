module.exports = {
  myService: {
    port: {
      doc: 'The API port',
      format: 'port',
      default: 3000,
      env: 'API_PORT'
    },
    public_url: {
      doc: 'The public url',
      format: 'url',
      default: 'http://localhost',
      env: 'PUBLIC_URL'
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
