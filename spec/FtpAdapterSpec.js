/* eslint-disable camelcase */ //
'use strict';

describe('function hasAppropriateContentType', () => {
	let payload = {};
	payload.source = {};
	payload.source.config = {};
	payload.source.config.redirect_uris = [''];
	payload.source.lastProcessedDate = '2017-12-23T11:27:53';

	const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});

	it('expected video or audio mime type but received null', function () {
		expect(ftpIngestor.hasAppropriateContentType(null)).toEqual(false);
	});
	it('expected video or audio mime type but received other mime type', function () {
		expect(ftpIngestor.hasAppropriateContentType('application/json')).toEqual(false);
	});
	it('expected video or audio mime type but received other mime type', function () {
		expect(ftpIngestor.hasAppropriateContentType('image/bmp')).toEqual(false);
	});
	it('expected video or audio mime type but received wrong mime type', function () {
		expect(ftpIngestor.hasAppropriateContentType('video.mp4')).toEqual(false);
	});
	it('expected video or audio mime type and got it', function () {
		expect(ftpIngestor.hasAppropriateContentType('video/mp4')).toEqual(true);
	});
	it('expected video or audio mime type and got it', function () {
		expect(ftpIngestor.hasAppropriateContentType('audio/mp3')).toEqual(true);
	});
});

describe('function hasAppropriateModifiedDate', () => {
	let payload = {};
	payload.source = {};
	payload.source.config = {};
	payload.source.config.redirect_uris = [''];

	it('with lastProcessedDateTime and empty modifiedTime', function () {
		payload.source.lastProcessedDateTime = '2017-12-23T11:27:53';
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate('')).toEqual(true);
	});
	it('with lastProcessedDateTime and empty modifiedTime', function () {
		payload.source.lastProcessedDateTime = '2017-12-23T11:27:53';
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate()).toEqual(true);
	});
	it('with lastProcessedDateTime and empty modifiedTime', function () {
		payload.source.lastProcessedDateTime = '2017-12-23T11:27:53';
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate(null)).toEqual(true);
	});
	it('with lastProcessedDateTime < modifiedTime', function () {
		payload.source.lastProcessedDateTime = '2017-12-23T11:27:53';
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate('2018-12-23T11:27:53')).toEqual(true);
	});
	it('with lastProcessedDateTime > modifiedTime', function () {
		payload.source.lastProcessedDateTime = '2018-12-23T11:27:53';
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate('2017-12-23T11:27:53')).toEqual(false);
	});
	it('without lastProcessedDateTime and empty modifiedTime', function () {
		payload.source.lastProcessedDateTime = null;
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate('')).toEqual(true);
	});
	it('without lastProcessedDateTime and empty modifiedTime', function () {
		payload.source.lastProcessedDateTime = null;
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate()).toEqual(true);
	});
	it('without lastProcessedDateTime and empty modifiedTime', function () {
		payload.source.lastProcessedDateTime = null;
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate(null)).toEqual(true);
	});
	it('without lastProcessedDateTime and with modifiedTime', function () {
		payload.source.lastProcessedDateTime = null;
		const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});
		expect(ftpIngestor.hasAppropriateModifiedDate('2018-12-23T11:27:53')).toEqual(true);
	});
});

describe('function generateTasks', () => {
	let payload = {};
	payload.source = {};
	payload.source.config = {};
	payload.source.config.redirect_uris = [''];

	const ftpIngestor = require('../ftp-ingestor')(payload, {}, {});

	it('expected array ', function () {
		let files = [{
			'date': '2018-03-08T08:00:36.008Z',
			'id': '1C1Oxq9Mvks58MEbx8C7qia0C2sMRk6Dr',
			'name': 'File_1.mp4',
			'mimeType': 'video/mp4',
			'modifiedTime': '2018-02-13T15:50:55.078Z',
			'fileExtension': 'mp4',
			'size': '19796869',
			'videoMediaMetadata': {
				'width': 640,
				'height': 360,
				'durationMillis': '240047'
			}
		}];
		files[0].duration = 240.047;
		let result = ftpIngestor.generateTasks(files);
		expect(result.length).toEqual(1);
		expect(result[0].payload.mode).toEqual('ingest');
		expect(result[0].payload.metadata).toEqual(files[0]);
	});

	it('empty folder', function () {
		expect(ftpIngestor.generateTasks([]).length).toEqual(0);
	});
});
