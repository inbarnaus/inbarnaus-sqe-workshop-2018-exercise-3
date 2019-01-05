import $ from 'jquery';
import {parseCode} from './code-analyzer';
import * as flowchart from 'flowchart.js';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let values = $('#values').val();
        let parsedCode = parseCode(codeToParse, values);
        $('#symSub').empty();
        flowchart.parse(parsedCode).drawSVG('symSub', {'flowstate' : {
            'past' : { 'fill' : '#CCCCCC', 'font-size' : 12},
            'current' : {'fill' : 'yellow', 'font-color' : 'red', 'font-weight' : 'bold', 'element-color' : 'red'},
            'future' : { 'fill' : 'white'},
            'request' : { 'fill' : 'blue'},
            'invalid': {'fill' : '#444444'},
            'approved' : { 'fill' : '#58C4A3', 'font-size' : 12, 'yes-text' : 'T', 'no-text' : 'F' },
            'rejected' : { 'fill' : '#C45879', 'font-size' : 12, 'yes-text' : 'n/a', 'no-text' : 'REJECTED' }
        }});
    });
});
