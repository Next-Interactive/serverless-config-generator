'use strict'

const fs = require('fs-extra')
const path = require('path')
const robConfig = require('rob-config')
const _get = require('lodash.get')

const CONFIG_FILE_NAME = 'config.js'

class ServerlessConfigGeneratorPlugin {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}

    this.commands = {
      'config-show': {
        usage: 'Configures environment variables',
        lifecycleEvents: ['show'],
        options: {
          value: { usage: 'Value of the attribute', shortcut: 'v' }
        }
      },
      'config-validate': {
        usage: 'Show config validation',
        lifecycleEvents: ['validate']
      }
    }

    this.hooks = {
      'config-show:show': this.envCommand.bind(this),
      'before:deploy:function:packageFunction': this.writeConfigFile.bind(this),
      'after:deploy:function:packageFunction': this.removeConfigFile.bind(this),
      'package:createDeploymentArtifacts': this.writeConfigFile.bind(
        this
      ),
      'package:createDeploymentArtifacts': this.removeConfigFile.bind(
        this
      ),
      'before:invoke:local:invoke': this.writeConfigFile.bind(this),
      'offline:start:init': this.writeConfigFile.bind(this),
      'offline:start:end': this.removeConfigFile.bind(this),
      'config-validate:validate': this.configValidate.bind(this)
    }
  }

  envCommand() {
    const config = this.getConfig()
    const envVars = this.getEnvVars(config)
    if (this.options.value) {
      console.log(envVars[this.options.value])

      return
    }

    console.log(envVars)
  }

  addEnvOverride(config, schema, schemaKey = 'properties') {
    for (let property in config) {
      if (typeof config[property] === 'object') {
        this.addEnvOverride(
          config[property],
          schema,
          schemaKey + '.' + property + '.properties'
        )
      } else {
        const value =
          typeof config[property] === 'string'
            ? `'${config[property]}'`
            : config[property]
        const specifiedEnvVarName = _get(
          schema,
          schemaKey + '.' + property + '.env'
        )
        config[property] = specifiedEnvVarName
          ? `process.env.hasOwnProperty('${specifiedEnvVarName}') ? process.env.${specifiedEnvVarName} : ${value}`
          : value
      }
    }

    return config
  }

  writeConfigFile() {
    const config = this.getConfig()
    this.serverless.cli.log('Creating config file...')
    const configVars = this.getEnvVars(config)
    const schemaKey = config.envWorkspace
      ? 'properties.' +
        config.envWorkspace
          .split('.')
          .map(v => v + '.properties')
          .join('.')
      : 'properties'

    const formattedConfigVars = this.addEnvOverride(
      configVars,
      this.getSchema(),
      schemaKey
    )
    const values = JSON.stringify(formattedConfigVars).replace(/["]+/g, '')

    return fs.writeFile(config.configPath, `module.exports = ${values}`)
  }

  removeConfigFile() {
    const config = this.getConfig()

    return fs.remove(config.configPath).then(_ => {
      this.serverless.cli.log('Removed config file')
    })
  }

  configValidate() {
    robConfig.validate()
    this.serverless.cli.log('Your configuration is valid')
  }

  getConfig() {
    const { config, processedInput, service } = this.serverless

    if (!this.config) {
      const servicePath = config.servicePath || '/'
      const stage = processedInput.options.stage || service.provider.stage
      this.config = {
        region: processedInput.options.region || service.provider.region,
        stage: stage,
        envWorkspace: service.custom.envWorkspace,
        configPath: path.join(servicePath, CONFIG_FILE_NAME)
      }
    }

    return this.config
  }

  getEnvVars(config) {
    robConfig.validate()

    return config.envWorkspace
      ? robConfig.get(config.envWorkspace)
      : robConfig.getProperties()
  }

  getSchema() {
    return robConfig.getSchema()
  }
}

module.exports = ServerlessConfigGeneratorPlugin
