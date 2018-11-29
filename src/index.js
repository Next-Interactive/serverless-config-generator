'use strict'

const fs = require('fs-extra')
const path = require('path')
const robConfig = require('rob-config')

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
      'before:deploy:createDeploymentArtifacts': this.writeConfigFile.bind(
        this
      ),
      'after:deploy:createDeploymentArtifacts': this.removeConfigFile.bind(
        this
      ),
      'before:invoke:local:invoke': this.writeConfigFile.bind(this),
      'after:invoke:local:invoke': this.removeConfigFile.bind(this),
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

  addEnvOverride(config, path, startPath = 'process.env.') {
    for (let property in config) {
      if (typeof config[property] === 'object') {
        const formattedPath =
          path === startPath
            ? `${path}${property.toUpperCase()}`
            : path !== ''
            ? `${path}_${property.toUpperCase()}`
            : property.toUpperCase()
        this.addEnvOverride(config[property], formattedPath)
      } else {
        const value =
          typeof config[property] === 'string'
            ? `'${config[property]}'`
            : config[property]
        config[
          property
        ] = `${path}_${property.toUpperCase()} || process.env.hasOwnProperty('${property.toUpperCase()}') ? undefined : ${value}`
      }
    }
    return config
  }

  writeConfigFile() {
    const config = this.getConfig()
    this.serverless.cli.log('Creating config file...')
    const configVars = this.getEnvVars(config)
    const formattedConfigVars = this.addEnvOverride(configVars, 'process.env.')
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
    const result = robConfig.get(config.envWorkspace)
    return result
  }
}

module.exports = ServerlessConfigGeneratorPlugin
