const expect = require('chai').expect
const sinon = require('sinon')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider')
const ConfigGenerator = require('../src')

const configResult = {
    port: 3123,
    public_url: 'http://localhost:8080'
}

describe('index.js', () => {
    let serverless, sandbox, configGenerator

    const initConfigGenerator = (options) => {
        configGenerator = new ConfigGenerator(serverless, options)
    }

    beforeEach(() => {
        sandbox = sinon.sandbox.create()

        serverless = new Serverless()
        serverless.service.provider.stage = 'dev'
        serverless.service.provider.region = 'eu-central-1'
        serverless.service.custom.envWorkspace = 'myService'
        serverless.init()
        serverless.setProvider('aws', new AwsProvider(serverless))
    })

    afterEach((done) => {
        sandbox.restore()
        done()
    })

    it('should have hooks', () => {
        initConfigGenerator()
        expect(Object.keys(configGenerator.hooks).length).to.not.equal(0)
    })

    it('should show config variables', () => {
        initConfigGenerator()
        sandbox.stub(configGenerator, 'getEnvVars').callsFake(config => {
            expect(config.region).to.equal('eu-central-1')
            expect(config.stage).to.equal('dev')
            expect(config.envWorkspace).to.equal('myService')
            return configResult
        })
        sinon.spy(console, 'log')
        configGenerator.hooks['config-show:show']()
        expect(configGenerator.getEnvVars.callCount).to.equal(1)
        expect(console.log.callCount).to.equal(1)
    })

    it('should read rob-config variables', () => {
        const config = configGenerator.getConfig()
        const robConfig = configGenerator.getEnvVars(config)
        expect(robConfig).to.not.be.null
        expect(robConfig.port).to.equal(3123)
        expect(robConfig.public_url).to.equal('http://localhost:8080')
    })

    it('should return an error if bad envWorkspace', () => {
        const config = configGenerator.getConfig()
        config.envWorkspace = 'badWorkspace'
        expect(configGenerator.getEnvVars.bind(configGenerator, config)).to
            .throw('cannot find configuration param \'badWorkspace\'')
    })
})

