//import * as esprima from 'esprima';
const esprima = require('esprima');
//import * as escodegen from 'escodegen';
const escodegen = require('escodegen');

let op;
let values = {};
let delimiter;
let qoutes;
let brackets1;
let brackets2;
let needReturnForIf = [];
let needReturnNotIf = [];
let directions;
let flag;
let varDeclflag = 0;
let array =[];

const parseCode = (codeToParse, values) => {
    flag=0;
    op=0;
    array = [];
    directions='';
    varDeclflag=0;
    needReturnForIf = [];
    needReturnNotIf = [];
    let parsed = esprima.parseScript(codeToParse, {loc: true});
    //console.log(directions);
    return createDiagram(parsed, values) + directions;
};

const createDiagram = (codeToParse, vals) =>{
    let vars = stringToArray(vals, ',');
    let params = codeToParse.body[0].params;
    for(let i=0; i<params.length; i++){
        values[params[i].name]= vars[i];
    }
    checkIf(codeToParse.body[0].body.body);
    return handleTypes(codeToParse.body[0].body.body);
};

const checkIf = (rec) =>{
    for(let i=0; i<rec.length && flag!==1; i++){
        if(rec[i].type === 'IfStatement')
            flag=1;
        else
            flag=0;
    }
};

const retValGl = (init) => {
    return init.type === 'Identifier' ? values[init.name]:
    // init.type === 'ArrayExpression' ? {'type': 'ArrayExpression', 'elements': init.elements.map(retValGl)} :
        init.type === 'BinaryExpression' ? {
            'type': 'BinaryExpression',
            'operator': init.operator,
            'left': retValGl(init.left),
            'right': retValGl(init.right),
            'loc': init.loc } :
            init.type === 'MemberExpression' ? values[init.object.name].elements[init.property.value] :
                init;
};

const handleExp = (exp) => {
    if(exp.type === 'VariableDeclaration'){
        for(let i =0; i<exp.declarations.length; i++)
            values[exp.declarations[i].id.name] = retValGl(exp.declarations[i].init);
    }
    else /*if(exp.type === 'ExpressionStatement')*/{
        let val = retValGl(exp.expression);
        if(exp.expression.left.type === 'MemberExpression')
            values[exp.expression.left.object.name].elements[exp.expression.left.property.value] = val;
        else
            values[exp.expression.left.name] = retValGl(exp.expression.right);
    }
    //else return;
};

const handleIfWhile = (exp) => {
    let answer ='';
    for(let i=0; i<exp.length; i++){
        switch (exp[i].type) {
        case 'IfStatement':
            answer = answer + handleIf(exp[i]);
            break;
        case 'WhileStatement':
            answer = answer + handleWhile(exp[i]);
            break;
        case 'ReturnStatement':
            answer = answer + handleReturn(exp[i]);
            break;
        default:
            answer = answer + handleTypes([exp[i]]);
        }
    }
    return answer;
};

const handleTypes = (exp) =>{
    let answer='';
    if(whileOrIfOrRet(exp[0])) {
        directions = directions + 'op' + op + '->';
        needReturnNotIf.push(op);
        answer = 'op' + op + '=>operation: ';
        op++;
        return answer + whileHandleTypes(exp);
    }
    else {
        varDeclflag = 1;
        return answer + handleIfWhile(exp);
    }
};

const whileHandleTypes = (exp) =>{
    let answer='', index=0;
    while (index < exp.length && whileOrIfOrRet(exp[index])) {
        handleExp(exp[index]);
        let gen = escodegen.generate(exp[index]);
        if(gen.substring(0, 3) === 'let') {
            gen = gen.substring(4);
            answer = answer + gen.substring(0, gen.length-1) + '\n';
            index++;
        }
        else{
            answer = answer + gen.substring(0, gen.length-1) + '\n';
            index++;
        }
    }
    return answer.substring(0, answer.length-1) + '|approved \n' + handleIfWhile(exp.slice(index));
};

const whileOrIfOrRet = (exp) =>{
    return exp.type !== 'IfStatement' && exp.type !=='WhileStatement' && exp.type !=='ReturnStatement';
};

const handleTypesForIf = (exp) =>{
    let tmp = op;
    //if(exp[0].type !== 'IfStatement' && exp[0].type !== 'WhileStatement') {
    directions = directions + 'op' + op + '\n';
    needReturnForIf.push(op);
    op++;
    return 'op' + tmp + '=>operation: ' + whileHandleForIf(exp);
    //}
    //return answer + handleIfWhile(exp);
};

const whileHandleForIf = (exp) =>{
    let answer = '', index = 0;
    while (index < exp.length && whileOrIfOrRet(exp[index])) {
        handleExp(exp[index]);
        let gen = escodegen.generate(exp[index]);
        answer = answer + gen.substring(0, gen.length-1) + '\n';
        index++;
    }
    return answer +handleIfWhile(exp.slice(index));
};

const handleTypesForIfWithColor = (exp) =>{
    let tmp= op;
    //  if(exp[0].type !== 'IfStatement' && exp[0].type !== 'WhileStatement') {
    directions = directions + 'op' + op + '\n';
    needReturnForIf.push(op);
    op++;
    return 'op' + tmp + '=>operation: ' + whileForIfWithColors(exp);
    // }
    //return answer + handleIfWhile(exp);
};
const whileForIfWithColors = (exp) =>{
    let index=0, answer='';
    while (index < exp.length && exp[index].type !== 'IfStatement' && exp[index].type !== 'WhileStatement') {
        handleExp(exp[index]);
        let gen = escodegen.generate(exp[index]);
        answer = answer + gen.substring(0, gen.length-1) + '\n';
        index++;
    }
    answer = answer.substring(0, answer.length-1) + '|approved \n';
    return answer + handleIfWhile(exp.slice(index));
};

const handleWhile = (exp) => {
    directions = directions + 'op' + op + '->';
    let answer = 'op' + op + '=>operation: NULL |approved' + '\n';
    let tmp1=op; // NULL vertex
    op++;
    answer = answer + 'op' + op + '=>condition: ';
    directions = directions + 'op' + op + '\n' + 'op' + op + '(yes)' + '->';
    op++;
    let tmp2 = op;//body vertex
    answer = answer + escodegen.generate(exp.test)+ '|approved \n';
    if(evalTest(exp.test) === 1) {
        answer = answer + handleTypesForIfWithColor(exp.body.body);
    }
    else{
        answer = answer + handleTypesForIf(exp.body.body);
    }
    directions = directions + 'op' + tmp2 + '->' + 'op' + tmp1 + '\n' + 'op' + (tmp2-1) + '(no)' + '->';
    return answer;
};

const handleReturn = (exp) => {
    let gen = escodegen.generate(exp);
    if(flag === 1){
        helpHandleReturn();
        return 'op' + op + '=>operation: ' + gen.substring(0, gen.length-1) +'|approved \n';
    }
    else {
        directions = directions + 'op' + op + '\n';
        return 'op' + op + '=>operation: ' + gen.substring(0, gen.length - 1) + '|approved \n';
    }
};

const checkHandleReturn = () =>{
    //if (needReturnForIf.length !== 0)
    for (let i = 0; i < needReturnForIf.length; i++)
        directions = directions + 'op' + needReturnForIf[i] + '->' + 'op' + op + '\n';
};

const helpHandleReturn = () =>{
    if(directions.substring(directions.length-2, directions.length) === '->') {
        directions = directions.substring(0, directions.length - 2) + '\n';
        checkHandleReturn();
    }
    else{
        checkHandleReturn();
    }
    /*else
        for(let i=0; i<needReturnNotIf.length; i++)
            directions = directions + 'op' + needReturnNotIf[i] + '->' + 'op' + op + '\n';*/
};

const recValue = (rec) => {
    rec.left = retValGl(rec.left);
    rec.right = retValGl(rec.right);
    return rec;
};

const handleIf = (exp) => {
    let answer = 'op' + op + '=>condition: ';
    if(varDeclflag === 1)
        directions = directions + 'op' + op + '(yes)' + '->';
    else
        directions = directions + 'op' + op + '\n' + 'op' + op + '(yes)' + '->';
    let tmp = op;
    op++;
    answer = answer + escodegen.generate(exp.test) + '|approved' + '\n';
    if(evalTest(exp.test) === 1){
        answer = answer +handleTypesForIfWithColor(exp.consequent.body);
    }
    else {
        answer = answer +handleTypesForIf(exp.consequent.body);
    }
    answer = answer + handleAlter(exp, tmp);
    return answer;
};

const handleAlter = (exp, tmp) =>{
    let answer='';
    if(exp.alternate !==null) {
        directions = directions + 'op' + tmp + '(no)' + '->';
        if (exp.alternate.type === 'BlockStatement') {
            if (evalTest(exp.test) === 0)
                answer = answer + handleTypesForIfWithColor(exp.alternate.body);
            else
                answer = answer + handleTypesForIf(exp.alternate.body);
        }
        else answer = answer + handleIfWhile([exp.alternate]);
    }
    else {
        directions = directions.substring(0, directions.length-1) + '->op' + op + '\n' + 'op' + tmp + '(no)' + '->';
        needReturnForIf.pop();
        needReturnForIf.push(op);
    }
    return answer;
};

const evalTest = (rec) => {
    if(rec.type === 'BinaryExpression') {
        rec = recValue(rec);
        return eval(escodegen.generate(rec)) === true ? 1 : 0;
    }
    else
        return eval(escodegen.generate(values[rec.name])) === true ? 1 : 0;
};

const stringToArray = (val, char) => {
    delimiter = val.indexOf(char);
    qoutes = val.indexOf('\'');
    brackets1 = val.indexOf('[');
    brackets2 = val.indexOf(']');
    if(delimiter !==-1){
        handleDelimiters(val);
        val=val.substring(delimiter+1);
        stringToArray(val, char);
        array.push(esprima.parseScript(val, { loc: true }).body[0].expression);
        return array;
    }
    else{
        array.push(esprima.parseScript(val, { loc: true }).body[0].expression);
        return array;
    }
};

const handleDelimiters = (val) => {
    if(qoutes!== -1 && qoutes<delimiter) {
        delimiter = val.indexOf('\'', qoutes + 1) + 1;
        array.push(esprima.parseScript(val.substring(0, delimiter), { loc: true }).body[0].expression);
    }
    else if(brackets1 !== -1 && brackets1<delimiter) {
        delimiter = brackets2 + 1;
        brackets1 = val.indexOf('[', brackets1+1);
        brackets2 = val.indexOf(']', brackets2+1);
        array.push(esprima.parseScript(val.substring(0, delimiter), { loc: true }).body[0].expression);
    }
    else array.push(esprima.parseScript(val.substring(0, delimiter), { loc: true }).body[0].expression);
};
/*
parseCode('function foo(x, y, z){\n' +
    '    let a = z + 1;\n' +
    '    let b = a + y;\n' +
    '    let c = 0;\n' +
    '    if(x){\n' +
    '      c = a + b;\n' +
    '    }\n' +
    '   \n' +
    '    return c;\n' +
    '}\n', 'true,2,3');
*/
export {parseCode, createDiagram};
