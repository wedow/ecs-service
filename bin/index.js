#!/usr/bin/env node

'use strict';
const pkg = require('../package.json');
const path = require('path');
const assert = require('assert-plus');
const program = require('commander');
const chalk = require('chalk');
const AWS = require('aws-sdk');
const ServiceManager = require('../lib').ServiceManager;
const fs = require('../lib/file.utils');

const showHelp = () => {
  program.outputHelp(chalk.blue);
};

function exitIfFailed(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  try {
    return fn.apply(null, args);
  } catch (err) {
    console.error(chalk.red(err.message));
    showHelp();
    process.exit(1);
  }
}

const exitOnFailedPromise = (promise) => promise.catch(err => {
  console.error(chalk.red(err.message));
  showHelp();
  process.exit(1);
});

const getOptions = (options) => {
  const accessKey = options.accessKeyId;
  const secretKey = options.secretAccessKey;
  const region = options.region;

  return {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region
  };
};

const createClient = (program) => {
  const options = exitIfFailed(getOptions, program);

  const config = {
    apiVersion: '2010-05-15',
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region
  };
  const client = new AWS.CloudFormation(config);
  return ServiceManager.create(client, fs);
};

const run = (client, stackname, version, envFilePath) => {

  const validate = (stackname, version) => {
    assert.string(stackname, 'Must provide stackname');
    assert.string(version, 'Must provide version');
  };

  exitIfFailed(validate, stackname, version);
  return client.deploy(stackname, version, path.resolve(envFilePath));
};

program
  .version(pkg.version)
  .option('-k, --access-key-id <id>', 'AWS Access key ID. Env: $AWS_ACCESS_KEY_ID')
  .option('-s, --secret-access-key <secret>', 'AWS Secret Access Key. Env: $AWS_SECRET_ACCESS_KEY')
  .option('-r, --region <region>', 'AWS Region. Env: $AWS_REGION')
  .option('-e, --env-file <file>', 'A .env file to supply to the container');

program
  .command('deploy [stackname] [version]')
  .description('Deploy ECS service using CF')
  .action((stackname, version) => {
    const client = createClient(program);
    exitOnFailedPromise(run(client, stackname, version, program.envFile));
  });


program.parse(process.argv);

if (!process.argv.slice(2).length) {
  showHelp();
}