# Split

Split is a simple open-source application for common expenses splitting. Splits can be easily shared by their URL addresses and therefore can be used for collaboration of few people. With Split you can make sure that everything is counted and nothing is missed.

## Project setup

### Install dependencies

    $ npm install

### Prepare environment variables

Create *.env.development.local* and/or *.env.production.local* file in the project root (.env.example can be used for reference). Make sure there is the [Appository Sync](https://github.com/andrew-markin/appository-sync) server running for data synchronization and correct VUE_APP_TOKEN environment variable is set for application authorization.

### Compiles and hot-reloads for development

    $ npm run serve

### Compiles and minifies for production

    $ npm run build

### Lints and fixes files

    $ npm run lint

## License

This repository is available under the [GNU General Public License](./LICENSE).
