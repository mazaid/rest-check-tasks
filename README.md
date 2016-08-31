# mazaid-rest-check-tasks

[![Code Climate](https://codeclimate.com/github/mazaid/rest-checks/badges/gpa.svg)](https://codeclimate.com/github/mazaid/rest-checks)
[![Test Coverage](https://codeclimate.com/github/mazaid/rest-checks/badges/coverage.svg)](https://codeclimate.com/github/mazaid/rest-checks/coverage)
[![Build Status](https://travis-ci.org/mazaid/rest-checks.svg?branch=master)](https://travis-ci.org/mazaid/rest-checks)

checks REST API

# Entity

```js
{
	id: "<Uuid>",
	name: "<String>",
	title: "<String>",
	description: "<String>",
	checker: "<String>",
	data: {
		// ...
	},
	active: "<Boolean>",
	deleted: "<Boolean>"

}
```

# REST API

## GET   /checkTasks

## POST  /checkTasks

## GET   /checks/:name

## PATCH /checks/:name

## POST  /checks/:name/check


# License

MIT
