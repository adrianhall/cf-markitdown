# Issue: Validation should be moved to middleware

The current project uses `/api/v1/convert` as an endpoint.  This contains three steps:

* Header Validation
* Authorization (via JWT and API-Key)
* Conversion

The header validation is either a "pass" or "fail" situation - if the headers are not validated, then the service should return the appropriate error; if the headers are valid, the original code is called.

* Move the header validation code to middleware `src/middleware/validateConversionHeaders.ts`
* Update the src/routes/convert.ts to use middleware, replacing the current validation code.
* Write unit tests for the validateConversionHeaders.ts.
* Update any tests for convert.ts - look for test reduction opportunities because of middleware
* Run the quality gate `pnpm run quality-gate` and ensure everything passes.
