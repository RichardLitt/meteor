var divRendersTo = function (test, div, html) {
  Deps.flush({_throwFirstError: true});
  var actual = canonicalizeHtml(div.innerHTML);
  test.equal(actual, html);
};

var nodesToArray = function (array) {
  // Starting in underscore 1.4, _.toArray does not work right on a node
  // list in IE8. This is a workaround to support IE8.
  return _.map(array, _.identity);
};

var clickIt = function (elem) {
  // jQuery's bubbling change event polyfill for IE 8 seems
  // to require that the element in question have focus when
  // it receives a simulated click.
  if (elem.focus)
    elem.focus();
  clickElement(elem);
};

Tinytest.add("spacebars-tests - template_tests - simple helper", function (test) {
  var tmpl = Template.spacebars_template_test_simple_helper;
  var R = ReactiveVar(1);
  tmpl.foo = function (x) {
    return x + R.get();
  };
  tmpl.bar = function () {
    return 123;
  };
  var div = renderToDiv(tmpl);

  test.equal(canonicalizeHtml(div.innerHTML), "124");
  R.set(2);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "125");

  // Test that `{{foo bar}}` throws if `foo` is missing or not a function.
  tmpl.foo = 3;
  test.throws(function () {
    renderToDiv(tmpl);
  }, /Can't call non-function/);

  delete tmpl.foo;
  test.throws(function () {
    renderToDiv(tmpl);
  }, /No such function/);

  tmpl.foo = function () {};
  // doesn't throw
  div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), '');

  // now "foo" is a function in the data context
  delete tmpl.foo;

  R = ReactiveVar(1);
  div = renderToDiv(tmpl, { foo: function (x) {
    return x + R.get();
  } });
  test.equal(canonicalizeHtml(div.innerHTML), "124");
  R.set(2);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "125");

  test.throws(function () {
    renderToDiv(tmpl, {foo: 3});
  }, /Can't call non-function/);

  test.throws(function () {
    renderToDiv(tmpl, {foo: null});
  }, /No such function/);

  test.throws(function () {
    renderToDiv(tmpl, {});
  }, /No such function/);
});

Tinytest.add("spacebars-tests - template_tests - dynamic template", function (test) {
  var tmpl = Template.spacebars_template_test_dynamic_template;
  var aaa = Template.spacebars_template_test_aaa;
  var bbb = Template.spacebars_template_test_bbb;
  var R = ReactiveVar("aaa");
  tmpl.foo = function () {
    return R.get() === 'aaa' ? aaa : bbb;
  };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "aaa");

  R.set('bbb');
  Deps.flush();

  test.equal(canonicalizeHtml(div.innerHTML), "bbb");
});

Tinytest.add("spacebars-tests - template_tests - interpolate attribute", function (test) {
  var tmpl = Template.spacebars_template_test_interpolate_attribute;
  tmpl.foo = function (x) {
    return x+1;
  };
  tmpl.bar = function () {
    return 123;
  };
  var div = renderToDiv(tmpl);

  test.equal($(div).find('div')[0].className, "aaa124zzz");
});

Tinytest.add("spacebars-tests - template_tests - dynamic attrs", function (test) {
  var tmpl = Template.spacebars_template_test_dynamic_attrs;

  var R2 = ReactiveVar({x: "X"});
  var R3 = ReactiveVar('selected');
  tmpl.attrsObj = function () { return R2.get(); };
  tmpl.singleAttr = function () { return R3.get(); };

  var div = renderToDiv(tmpl);
  var span = $(div).find('span')[0];
  test.equal(span.innerHTML, 'hi');
  test.isTrue(span.hasAttribute('selected'));
  test.equal(span.getAttribute('x'), 'X');

  R2.set({y: "Y", z: "Z"});
  R3.set('');
  Deps.flush();
  test.equal(canonicalizeHtml(span.innerHTML), 'hi');
  test.isFalse(span.hasAttribute('selected'));
  test.isFalse(span.hasAttribute('x'));
  test.equal(span.getAttribute('y'), 'Y');
  test.equal(span.getAttribute('z'), 'Z');
});

Tinytest.add("spacebars-tests - template_tests - triple", function (test) {
  var tmpl = Template.spacebars_template_test_triple;

  var R = ReactiveVar('<span class="hi">blah</span>');
  tmpl.html = function () { return R.get(); };

  var div = renderToDiv(tmpl);
  var elems = $(div).find("> *");
  test.equal(elems.length, 1);
  test.equal(elems[0].nodeName, 'SPAN');
  var span = elems[0];
  test.equal(span.className, 'hi');
  test.equal(span.innerHTML, 'blah');

  R.set('asdf');
  Deps.flush();
  elems = $(div).find("> *");
  test.equal(elems.length, 0);
  test.equal(canonicalizeHtml(div.innerHTML), 'asdf');

  R.set('<span class="hi">blah</span>');
  Deps.flush();
  elems = $(div).find("> *");
  test.equal(elems.length, 1);
  test.equal(elems[0].nodeName, 'SPAN');
  span = elems[0];
  test.equal(span.className, 'hi');
  test.equal(canonicalizeHtml(span.innerHTML), 'blah');

  var tmpl = Template.spacebars_template_test_triple2;
  tmpl.html = function () {};
  tmpl.html2 = function () { return null; };
  // no tmpl.html3
  div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), 'xy');
});

Tinytest.add("spacebars-tests - template_tests - inclusion args", function (test) {
  var tmpl = Template.spacebars_template_test_inclusion_args;

  var R = ReactiveVar(Template.spacebars_template_test_aaa);
  tmpl.foo = function () { return R.get(); };

  var div = renderToDiv(tmpl);
  // `{{> foo bar}}`, with `foo` resolving to Template.aaa,
  // which consists of "aaa"
  test.equal(canonicalizeHtml(div.innerHTML), 'aaa');
  R.set(Template.spacebars_template_test_bbb);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), 'bbb');

  ////// Ok, now `foo` *is* Template.aaa
  tmpl.foo = Template.spacebars_template_test_aaa;
  div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), 'aaa');

  ////// Ok, now `foo` is a template that takes an argument; bar is a string.
  tmpl.foo = Template.spacebars_template_test_bracketed_this;
  tmpl.bar = 'david';
  div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), '[david]');

  ////// Now `foo` is a template that takes an arg; bar is a function.
  tmpl.foo = Template.spacebars_template_test_span_this;
  R = ReactiveVar('david');
  tmpl.bar = function () { return R.get(); };
  div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), '<span>david</span>');
  var span1 = div.querySelector('span');
  R.set('avi');
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), '<span>avi</span>');
  var span2 = div.querySelector('span');
  test.isTrue(span1 === span2);
});

Tinytest.add("spacebars-tests - template_tests - inclusion args 2", function (test) {
  // `{{> foo bar q=baz}}`
  var tmpl = Template.spacebars_template_test_inclusion_args2;

  tmpl.foo = Template.spacebars_template_test_span_this;
  tmpl.bar = function (options) {
    return options.hash.q;
  };

  var R = ReactiveVar('david!');
  tmpl.baz = function () { return R.get().slice(0,5); };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), '<span>david</span>');
  var span1 = div.querySelector('span');
  R.set('brillo');
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), '<span>brill</span>');
  var span2 = div.querySelector('span');
  test.isTrue(span1 === span2);
});

// maybe use created callback on the template instead of this?
var extendTemplateWithInit = function (template, initFunc) {
  return Template.__create__(
    template.__viewName+'-extended',
    template.__render,
    initFunc);
};

Tinytest.add("spacebars-tests - template_tests - inclusion dotted args", function (test) {
  // `{{> foo bar.baz}}`
  var tmpl = Template.spacebars_template_test_inclusion_dotted_args;

  var initCount = 0;
  tmpl.foo = extendTemplateWithInit(
    Template.spacebars_template_test_bracketed_this,
    function () { initCount++; });

  var R = ReactiveVar('david');
  tmpl.bar = function () {
    // make sure `this` is bound correctly
    return { baz: this.symbol + R.get() };
  };

  var div = renderToDiv(tmpl, {symbol:'%'});
  test.equal(initCount, 1);
  test.equal(canonicalizeHtml(div.innerHTML), '[%david]');

  R.set('avi');
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), '[%avi]');
  // check that invalidating the argument to `foo` doesn't require
  // creating a new `foo`.
  test.equal(initCount, 1);
});

Tinytest.add("spacebars-tests - template_tests - inclusion slashed args", function (test) {
  // `{{> foo bar/baz}}`
  var tmpl = Template.spacebars_template_test_inclusion_dotted_args;

  var initCount = 0;
  tmpl.foo = extendTemplateWithInit(
    Template.spacebars_template_test_bracketed_this,
    function () { initCount++; });
  var R = ReactiveVar('david');
  tmpl.bar = function () {
    // make sure `this` is bound correctly
    return { baz: this.symbol + R.get() };
  };

  var div = renderToDiv(tmpl, {symbol:'%'});
  test.equal(initCount, 1);
  test.equal(canonicalizeHtml(div.innerHTML), '[%david]');
});

Tinytest.add("spacebars-tests - template_tests - block helper", function (test) {
  // test the case where `foo` is a calculated template that changes
  // reactively.
  // `{{#foo}}bar{{else}}baz{{/foo}}`
  var tmpl = Template.spacebars_template_test_block_helper;
  var R = ReactiveVar(Template.spacebars_template_test_content);
  tmpl.foo = function () {
    return R.get();
  };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "bar");

  R.set(Template.spacebars_template_test_elsecontent);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "baz");
});

Tinytest.add("spacebars-tests - template_tests - block helper function with one string arg", function (test) {
  // `{{#foo "bar"}}content{{/foo}}`
  var tmpl = Template.spacebars_template_test_block_helper_function_one_string_arg;
  tmpl.foo = function () {
    if (String(this) === "bar")
      return Template.spacebars_template_test_content;
    else
      return null;
  };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "content");
});

Tinytest.add("spacebars-tests - template_tests - block helper function with one helper arg", function (test) {
  var tmpl = Template.spacebars_template_test_block_helper_function_one_helper_arg;
  var R = ReactiveVar("bar");
  tmpl.bar = function () { return R.get(); };
  tmpl.foo = function () {
    if (String(this) === "bar")
      return Template.spacebars_template_test_content;
    else
      return null;
  };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "content");

  R.set("baz");
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "");
});

Tinytest.add("spacebars-tests - template_tests - block helper component with one helper arg", function (test) {
  var tmpl = Template.spacebars_template_test_block_helper_component_one_helper_arg;
  var R = ReactiveVar(true);
  tmpl.bar = function () { return R.get(); };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "content");

  R.set(false);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "");
});

Tinytest.add("spacebars-tests - template_tests - block helper component with three helper args", function (test) {
  var tmpl = Template.spacebars_template_test_block_helper_component_three_helper_args;
  var R = ReactiveVar("bar");
  tmpl.bar_or_baz = function () {
    return R.get();
  };
  tmpl.equals = function (x, y) {
    return x === y;
  };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "content");

  R.set("baz");
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "");
});

Tinytest.add("spacebars-tests - template_tests - block helper with dotted arg", function (test) {
  var tmpl = Template.spacebars_template_test_block_helper_dotted_arg;
  var R1 = ReactiveVar(1);
  var R2 = ReactiveVar(10);
  var R3 = ReactiveVar(100);

  var initCount = 0;
  tmpl.foo = extendTemplateWithInit(
    Template.spacebars_template_test_bracketed_this,
    function () { initCount++; });
  tmpl.bar = function () {
    return {
      r1: R1.get(),
      baz: function (r3) {
        return this.r1 + R2.get() + r3;
      }
    };
  };
  tmpl.qux = function () { return R3.get(); };

  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "[111]");
  test.equal(initCount, 1);

  R1.set(2);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "[112]");
  test.equal(initCount, 1);

  R2.set(20);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "[122]");
  test.equal(initCount, 1);

  R3.set(200);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "[222]");
  test.equal(initCount, 1);

  R2.set(30);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "[232]");
  test.equal(initCount, 1);

  R1.set(3);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "[233]");
  test.equal(initCount, 1);

  R3.set(300);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), "[333]");
  test.equal(initCount, 1);
});

Tinytest.add("spacebars-tests - template_tests - nested content", function (test) {
  // Test that `{{> UI.contentBlock}}` in an `{{#if}}` works.

  // ```
  // <template name="spacebars_template_test_iftemplate">
  //   {{#if condition}}
  //     {{> UI.contentBlock}}
  //   {{else}}
  //     {{> UI.elseBlock}}
  //   {{/if}}
  // </template>
  // ```

  // ```
  //  {{#spacebars_template_test_iftemplate flag}}
  //    hello
  //  {{else}}
  //    world
  //  {{/spacebars_template_test_iftemplate}}
  // ```

  var tmpl = Template.spacebars_template_test_nested_content;
  var R = ReactiveVar(true);
  tmpl.flag = function () {
    return R.get();
  };
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), 'hello');
  R.set(false);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), 'world');
  R.set(true);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), 'hello');

  // Also test that `{{> UI.contentBlock}}` in a custom block helper works.
  tmpl = Template.spacebars_template_test_nested_content2;
  R = ReactiveVar(true);
  tmpl.x = function () {
    return R.get();
  };
  div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), 'hello');
  R.set(false);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), 'world');
  R.set(true);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), 'hello');
});

Tinytest.add("spacebars-tests - template_tests - if", function (test) {
  var tmpl = Template.spacebars_template_test_if;
  var R = ReactiveVar(true);
  tmpl.foo = function () {
    return R.get();
  };
  tmpl.bar = 1;
  tmpl.baz = 2;

  var div = renderToDiv(tmpl);
  var rendersTo = function (html) { divRendersTo(test, div, html); };

  rendersTo("1");
  R.set(false);
  rendersTo("2");
});

Tinytest.add("spacebars-tests - template_tests - if in with", function (test) {
  var tmpl = Template.spacebars_template_test_if_in_with;
  tmpl.foo = {bar: "bar"};

  var div = renderToDiv(tmpl);
  divRendersTo(test, div, "bar bar");
});

Tinytest.add("spacebars-tests - template_tests - each on cursor", function (test) {
  var tmpl = Template.spacebars_template_test_each;
  var coll = new Meteor.Collection(null);
  tmpl.items = function () {
    return coll.find({}, {sort: {pos: 1}});
  };

  var div = renderToDiv(tmpl);
  var rendersTo = function (html) { divRendersTo(test, div, html); };

  rendersTo("else-clause");
  coll.insert({text: "one", pos: 1});
  rendersTo("one");
  coll.insert({text: "two", pos: 2});
  rendersTo("one two");
  coll.update({text: "two"}, {$set: {text: "three"}});
  rendersTo("one three");
  coll.update({text: "three"}, {$set: {pos: 0}});
  rendersTo("three one");
  coll.remove({});
  rendersTo("else-clause");
});

Tinytest.add("spacebars-tests - template_tests - each on array", function (test) {
  var tmpl = Template.spacebars_template_test_each;
  var R = new ReactiveVar([]);
  tmpl.items = function () {
    return R.get();
  };
  tmpl.text = function () {
    return this;
  };

  var div = renderToDiv(tmpl);
  var rendersTo = function (html) { divRendersTo(test, div, html); };

  rendersTo("else-clause");
  R.set([""]);
  rendersTo("");
  R.set(["x", "", "toString"]);
  rendersTo("x toString");
  R.set(["toString"]);
  rendersTo("toString");
  R.set([]);
  rendersTo("else-clause");
  R.set([0, 1, 2]);
  rendersTo("0 1 2");
  R.set([]);
  rendersTo("else-clause");
});

Tinytest.add("spacebars-tests - template_tests - ..", function (test) {
  var tmpl = Template.spacebars_template_test_dots;
  Template.spacebars_template_test_dots_subtemplate.getTitle = function (from) {
    return from.title;
  };

  tmpl.foo = {title: "foo"};
  tmpl.foo.bar = {title: "bar"};
  tmpl.foo.bar.items = [{title: "item"}];
  var div = renderToDiv(tmpl);

  test.equal(canonicalizeHtml(div.innerHTML), [
    "A", "B", "C", "D",
    // {{> spacebars_template_test_dots_subtemplate}}
    "TITLE", "1item", "2item", "3bar", "4foo", "GETTITLE", "5item", "6bar", "7foo",
    // {{> spacebars_template_test_dots_subtemplate ..}}
    "TITLE", "1bar", "2bar", "3item", "4bar", "GETTITLE", "5bar", "6item", "7bar"].join(" "));
});

Tinytest.add("spacebars-tests - template_tests - select tags", function (test) {
  var tmpl = Template.spacebars_template_test_select_tag;

  // {label: (string)}
  var optgroups = new Meteor.Collection(null);

  // {optgroup: (id), value: (string), selected: (boolean), label: (string)}
  var options = new Meteor.Collection(null);

  tmpl.optgroups = function () { return optgroups.find(); };
  tmpl.options = function () { return options.find({optgroup: this._id}); };
  tmpl.selectedAttr = function () { return this.selected ? {selected: true} : {}; };

  var div = renderToDiv(tmpl);
  var selectEl = $(div).find('select')[0];

  // returns canonicalized contents of `div` in the form eg
  // ["<select>", "</select>"]. strip out selected attributes -- we
  // verify correctness by observing the `selected` property
  var divContent = function () {
    return canonicalizeHtml(
      div.innerHTML.replace(/selected="[^"]*"/g, '').replace(/selected/g, ''))
          .replace(/\>\s*\</g, '>\n<')
          .split('\n');
  };

  test.equal(divContent(), ["<select>", "</select>"]);

  var optgroup1 = optgroups.insert({label: "one"});
  var optgroup2 = optgroups.insert({label: "two"});
  test.equal(divContent(), [
    '<select>',
    '<optgroup label="one">',
    '</optgroup>',
    '<optgroup label="two">',
    '</optgroup>',
    '</select>'
  ]);

  options.insert({optgroup: optgroup1, value: "value1", selected: false, label: "label1"});
  options.insert({optgroup: optgroup1, value: "value2", selected: true, label: "label2"});
  test.equal(divContent(), [
    '<select>',
    '<optgroup label="one">',
    '<option value="value1">label1</option>',
    '<option value="value2">label2</option>',
    '</optgroup>',
    '<optgroup label="two">',
    '</optgroup>',
    '</select>'
  ]);
  test.equal(selectEl.value, "value2");
  test.equal($(selectEl).find('option')[0].selected, false);
  test.equal($(selectEl).find('option')[1].selected, true);

  // swap selection
  options.update({value: "value1"}, {$set: {selected: true}});
  options.update({value: "value2"}, {$set: {selected: false}});
  Deps.flush();

  test.equal(divContent(), [
    '<select>',
    '<optgroup label="one">',
    '<option value="value1">label1</option>',
    '<option value="value2">label2</option>',
    '</optgroup>',
    '<optgroup label="two">',
    '</optgroup>',
    '</select>'
  ]);
  test.equal(selectEl.value, "value1");
  test.equal($(selectEl).find('option')[0].selected, true);
  test.equal($(selectEl).find('option')[1].selected, false);

  // change value and label
  options.update({value: "value1"}, {$set: {value: "value1.0"}});
  options.update({value: "value2"}, {$set: {label: "label2.0"}});
  Deps.flush();

  test.equal(divContent(), [
    '<select>',
    '<optgroup label="one">',
    '<option value="value1.0">label1</option>',
    '<option value="value2">label2.0</option>',
    '</optgroup>',
    '<optgroup label="two">',
    '</optgroup>',
    '</select>'
  ]);
  test.equal(selectEl.value, "value1.0");
  test.equal($(selectEl).find('option')[0].selected, true);
  test.equal($(selectEl).find('option')[1].selected, false);

  // unselect and then select both options. normally, the second is
  // selected (since it got selected later). then switch to <select
  // multiple="">. both should be selected.
  options.update({}, {$set: {selected: false}}, {multi: true});
  Deps.flush();
  options.update({}, {$set: {selected: true}}, {multi: true});
  Deps.flush();
  test.equal($(selectEl).find('option')[0].selected, false);
  test.equal($(selectEl).find('option')[1].selected, true);

  selectEl.multiple = true; // allow multiple selection
  options.update({}, {$set: {selected: false}}, {multi: true});
  Deps.flush();
  options.update({}, {$set: {selected: true}}, {multi: true});
  window.avital = true;
  Deps.flush();
  test.equal($(selectEl).find('option')[0].selected, true);
  test.equal($(selectEl).find('option')[1].selected, true);
});

Tinytest.add('spacebars-tests - template_tests - {{#with}} falsy; issue #770', function (test) {
  Template.test_template_issue770.value1 = function () { return "abc"; };
  Template.test_template_issue770.value2 = function () { return false; };
  var div = renderToDiv(Template.test_template_issue770);
  test.equal(canonicalizeHtml(div.innerHTML),
             "abc xxx abc");
});

Tinytest.add("spacebars-tests - template_tests - tricky attrs", function (test) {
  var tmpl = Template.spacebars_template_test_tricky_attrs;
  tmpl.theType = function () { return 'text'; };
  var R = ReactiveVar('foo');
  tmpl.theClass = function () { return R.get(); };

  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML).slice(0, 30),
             '<input type="text"><input class="foo" type="checkbox">'.slice(0, 30));

  R.set('bar');
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML),
             '<input type="text"><input class="bar" type="checkbox">');

});

Tinytest.add('spacebars-tests - template_tests - no data context', function (test) {
  var tmpl = Template.spacebars_template_test_no_data;

  // failure is if an exception is thrown here
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), 'asdf');
});

Tinytest.add('spacebars-tests - template_tests - textarea', function (test) {
  var tmpl = Template.spacebars_template_test_textarea;

  var R = ReactiveVar('hello');

  tmpl.foo = function () {
    return R.get();
  };

  var div = renderToDiv(tmpl);
  var textarea = div.querySelector('textarea');
  test.equal(textarea.value, 'hello');

  R.set('world');
  Deps.flush();
  test.equal(textarea.value, 'world');

});

Tinytest.add('spacebars-tests - template_tests - textarea 2', function (test) {
  var tmpl = Template.spacebars_template_test_textarea2;

  var R = ReactiveVar(true);

  tmpl.foo = function () {
    return R.get();
  };

  var div = renderToDiv(tmpl);
  var textarea = div.querySelector('textarea');
  test.equal(textarea.value, '</not a tag>');

  R.set(false);
  Deps.flush();
  test.equal(textarea.value, '<also not a tag>');

  R.set(true);
  Deps.flush();
  test.equal(textarea.value, '</not a tag>');

});

Tinytest.add('spacebars-tests - template_tests - textarea 3', function (test) {
  var tmpl = Template.spacebars_template_test_textarea3;

  var R = ReactiveVar('hello');

  tmpl.foo = function () {
    return R.get();
  };

  var div = renderToDiv(tmpl);
  var textarea = div.querySelector('textarea');
  test.equal(textarea.id, 'myTextarea');
  test.equal(textarea.value, 'hello');

  R.set('world');
  Deps.flush();
  test.equal(textarea.value, 'world');

});

Tinytest.add('spacebars-tests - template_tests - textarea each', function (test) {
  var tmpl = Template.spacebars_template_test_textarea_each;

  var R = ReactiveVar(['APPLE', 'BANANA']);

  tmpl.foo = function () {
    return R.get();
  };

  var div = renderToDiv(tmpl);
  var textarea = div.querySelector('textarea');
  test.equal(textarea.value, '<not a tag APPLE <not a tag BANANA ');

  R.set([]);
  Deps.flush();
  test.equal(textarea.value, '<>');

  R.set(['CUCUMBER']);
  Deps.flush();
  test.equal(textarea.value, '<not a tag CUCUMBER ');

});

// Ensure that one can call `Meteor.defer` within a rendered callback
// triggered by a document insertion that happend in a method stub.
//
// Why do we have this test? Because you generally can't call
// `Meteor.defer` inside a method stub (see
// packages/meteor/timers.js).  This test verifies that rendered
// callbacks don't fire synchronously as part of a method stub.
testAsyncMulti('spacebars-tests - template_tests - defer in rendered callbacks', [function (test, expect) {
  var tmpl = Template.spacebars_template_test_defer_in_rendered;
  var coll = new Meteor.Collection(null);

  Meteor.methods({
    spacebarsTestInsertEmptyObject: function () {
      // cause a new instance of `subtmpl` to be placed in the
      // DOM. verify that it's not fired directly within a method
      // stub, in which `Meteor.defer` is not allowed.
      coll.insert({});
    }
  });

  tmpl.items = function () {
    return coll.find();
  };

  var subtmpl = Template.spacebars_template_test_defer_in_rendered_subtemplate;

  subtmpl.rendered = expect(function () {
    // will throw if called in a method stub
    Meteor.defer(function () {});
  });

  var div = renderToDiv(tmpl);

  // not defined on the server, but it's fine since the stub does
  // the relevant work
  Meteor._suppress_log(1);
  Meteor.call("spacebarsTestInsertEmptyObject");
}]);

testAsyncMulti('spacebars-tests - template_tests - rendered template is DOM in rendered callbacks', [
  function (test, expect) {
    var tmpl = Template.spacebars_template_test_aaa;
    tmpl.rendered = expect(function () {
      test.equal(canonicalizeHtml(div.innerHTML), "aaa");
    });
    var div = renderToDiv(tmpl);
    Deps.flush();
  }
]);

// Test that in:
//
// ```
// {{#with someData}}
//   {{foo}} {{bar}}
// {{/with}}
// ```
//
// ... we run `someData` once even if `foo` re-renders.
Tinytest.add('spacebars-tests - template_tests - with someData', function (test) {
  var tmpl = Template.spacebars_template_test_with_someData;

  var foo = ReactiveVar('AAA');
  var someDataRuns = 0;

  tmpl.someData = function () {
    someDataRuns++;
    return {};
  };
  tmpl.foo = function () {
    return foo.get();
  };
  tmpl.bar = function () {
    return 'YO';
  };

  var div = renderToDiv(tmpl);

  test.equal(someDataRuns, 1);
  test.equal(canonicalizeHtml(div.innerHTML), 'AAA YO');

  foo.set('BBB');
  Deps.flush();
  test.equal(someDataRuns, 1);
  test.equal(canonicalizeHtml(div.innerHTML), 'BBB YO');

  foo.set('CCC');
  Deps.flush();
  test.equal(someDataRuns, 1);
  test.equal(canonicalizeHtml(div.innerHTML), 'CCC YO');
});

Tinytest.add('spacebars-tests - template_tests - #each stops when rendered element is removed', function (test) {
  var tmpl = Template.spacebars_template_test_each_stops;
  var coll = new Meteor.Collection(null);
  coll.insert({});
  tmpl.items = function () { return coll.find(); };

  var div = renderToDiv(tmpl);
  divRendersTo(test, div, 'x');

  // trigger #each component destroyed
  $(div).remove();

  // insert another document. cursor should no longer be observed so
  // should have no effect.
  coll.insert({});
  divRendersTo(test, div, 'x');
});

Tinytest.add('spacebars-tests - template_tests - block helpers in attribute', function (test) {
  var tmpl = Template.spacebars_template_test_block_helpers_in_attribute;

  var coll = new Meteor.Collection(null);
  tmpl.classes = function () {
    return coll.find({}, {sort: {name: 1}});
  };
  tmpl.startsLowerCase = function (name) {
    return /^[a-z]/.test(name);
  };
  coll.insert({name: 'David'});
  coll.insert({name: 'noodle'});
  coll.insert({name: 'donut'});
  coll.insert({name: 'frankfurter'});
  coll.insert({name: 'Steve'});

  var containerDiv = renderToDiv(tmpl);
  var div = containerDiv.querySelector('div');

  var shouldBe = function (className) {
    Deps.flush();
    test.equal(div.innerHTML, "Smurf");
    test.equal(div.className, className);
    var result = canonicalizeHtml(containerDiv.innerHTML);
    if (result === '<div>Smurf</div>')
      result = '<div class="">Smurf</div>'; // e.g. IE 9 and 10
    test.equal(result, '<div class="' + className + '">Smurf</div>');
  };

  shouldBe('donut frankfurter noodle');
  coll.remove({name: 'frankfurter'}); // (it was kind of a mouthful)
  shouldBe('donut noodle');
  coll.remove({name: 'donut'});
  shouldBe('noodle');
  coll.remove({name: 'noodle'});
  shouldBe(''); // 'David' and 'Steve' appear in the #each but fail the #if
  coll.remove({});
  shouldBe('none'); // now the `{{else}}` case kicks in
  coll.insert({name: 'bubblegum'});
  shouldBe('bubblegum');
});

Tinytest.add('spacebars-tests - template_tests - block helpers in attribute 2', function (test) {
  var tmpl = Template.spacebars_template_test_block_helpers_in_attribute_2;

  var R = ReactiveVar(true);

  tmpl.foo = function () { return R.get(); };

  var div = renderToDiv(tmpl);
  var input = div.querySelector('input');

  test.equal(input.value, '"');
  R.set(false);
  Deps.flush();
  test.equal(input.value, '&<></x>');
});


// Test that if the argument to #each is a constant, it doesn't establish a
// dependency on the data context, so when the context changes, items of
// the #each are not "changed" and helpers do not rerun.
Tinytest.add('spacebars-tests - template_tests - constant #each argument', function (test) {
  var tmpl = Template.spacebars_template_test_constant_each_argument;

  var justReturnRuns = 0; // how many times `justReturn` is called
  var R = ReactiveVar(1);

  tmpl.someData = function () {
    return R.get();
  };
  tmpl.anArray = ['foo', 'bar'];
  tmpl.justReturn = function (x) {
    justReturnRuns++;
    return String(x);
  };

  var div = renderToDiv(tmpl);

  test.equal(justReturnRuns, 2);
  test.equal(canonicalizeHtml(div.innerHTML).replace(/\s+/g, ' '),
             'foo bar 1');

  R.set(2);
  Deps.flush();

  test.equal(justReturnRuns, 2); // still 2, no new runs!
  test.equal(canonicalizeHtml(div.innerHTML).replace(/\s+/g, ' '),
             'foo bar 2');
});

Tinytest.addAsync('spacebars-tests - template_tests - #markdown - basic', function (test, onComplete) {
  var tmpl = Template.spacebars_template_test_markdown_basic;
  tmpl.obj = {snippet: "<i>hi</i>"};
  tmpl.hi = function () {
    return this.snippet;
  };
  var div = renderToDiv(tmpl);

  Meteor.call("getAsset", "markdown_basic.html", function (err, html) {
    test.isFalse(err);
    test.equal(canonicalizeHtml(div.innerHTML),
               canonicalizeHtml(html));
    onComplete();
  });
});

testAsyncMulti('spacebars-tests - template_tests - #markdown - if', [
  function (test, expect) {
    var self = this;
    Meteor.call("getAsset", "markdown_if1.html", expect(function (err, html) {
      test.isFalse(err);
      self.html1 = html;
    }));
    Meteor.call("getAsset", "markdown_if2.html", expect(function (err, html) {
      test.isFalse(err);
      self.html2 = html;
    }));
  },

  function (test, expect) {
    var self = this;
    var tmpl = Template.spacebars_template_test_markdown_if;
    var R = new ReactiveVar(false);
    tmpl.cond = function () { return R.get(); };

    var div = renderToDiv(tmpl);
    test.equal(canonicalizeHtml(div.innerHTML), canonicalizeHtml(self.html1));
    R.set(true);
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), canonicalizeHtml(self.html2));
  }
]);

testAsyncMulti('spacebars-tests - template_tests - #markdown - each', [
  function (test, expect) {
    var self = this;
    Meteor.call("getAsset", "markdown_each1.html", expect(function (err, html) {
      test.isFalse(err);
      self.html1 = html;
    }));
    Meteor.call("getAsset", "markdown_each2.html", expect(function (err, html) {
      test.isFalse(err);
      self.html2 = html;
    }));
  },

  function (test, expect) {
    var self = this;
    var tmpl = Template.spacebars_template_test_markdown_each;
    var R = new ReactiveVar([]);
    tmpl.seq = function () { return R.get(); };

    var div = renderToDiv(tmpl);
    test.equal(canonicalizeHtml(div.innerHTML), canonicalizeHtml(self.html1));

    R.set(["item"]);
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), canonicalizeHtml(self.html2));
  }
]);

Tinytest.add('spacebars-tests - template_tests - #markdown - inclusion', function (test) {
  var tmpl = Template.spacebars_template_test_markdown_inclusion;
  var subtmpl = Template.spacebars_template_test_markdown_inclusion_subtmpl;
  subtmpl.foo = "bar";
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "<p><span>Foo is bar.</span></p>");
});

Tinytest.add('spacebars-tests - template_tests - #markdown - block helpers', function (test) {
  var tmpl = Template.spacebars_template_test_markdown_block_helpers;
  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), "<p>Hi there!</p>");
});

// Test that when a simple helper re-runs due to a dependency changing
// but the return value is the same, the DOM text node is not
// re-rendered.
Tinytest.add('spacebars-tests - template_tests - simple helpers are isolated', function (test) {
  var runs = [{
    helper: function () { return "foo"; },
    nodeValue: "foo"
  }, {
    helper: function () { return new Spacebars.SafeString("bar"); },
    nodeValue: "bar"
  }];

  _.each(runs, function (run) {
    var tmpl = Template.spacebars_template_test_simple_helpers_are_isolated;
    var dep = new Deps.Dependency;
    tmpl.foo = function () {
      dep.depend();
      return run.helper();
    };
    var div = renderToDiv(tmpl);
    var fooTextNode = _.find(div.childNodes, function (node) {
      return node.nodeValue === run.nodeValue;
    });

    test.isTrue(fooTextNode);

    dep.changed();
    Deps.flush();
    var newFooTextNode = _.find(div.childNodes, function (node) {
      return node.nodeValue === run.nodeValue;
    });

    test.equal(fooTextNode, newFooTextNode);
  });
});

// Test that when a helper in an element attribute re-runs due to a
// dependency changing but the return value is the same, the attribute
// value is not set.
Tinytest.add('spacebars-tests - template_tests - attribute helpers are isolated', function (test) {
  var tmpl = Template.spacebars_template_test_attr_helpers_are_isolated;
  var dep = new Deps.Dependency;
  tmpl.foo = function () {
    dep.depend();
    return "foo";
  };
  var div = renderToDiv(tmpl);
  var pElement = div.querySelector('p');

  test.equal(pElement.getAttribute('attr'), 'foo');

  // set the attribute to something else, afterwards check that it
  // hasn't been updated back to the correct value.
  pElement.setAttribute('attr', 'not-foo');
  dep.changed();
  Deps.flush();
  test.equal(pElement.getAttribute('attr'), 'not-foo');
});

// A helper can return an object with a set of element attributes via
// `<p {{attrs}}>`. When it re-runs due to a dependency changing the
// value for a given attribute might stay the same. Test that the
// attribute is not set on the DOM element.
Tinytest.add('spacebars-tests - template_tests - attribute object helpers are isolated', function (test) {
  var tmpl = Template.spacebars_template_test_attr_object_helpers_are_isolated;
  var dep = new Deps.Dependency;
  tmpl.attrs = function () {
    dep.depend();
    return {foo: "bar"};
  };
  var div = renderToDiv(tmpl);
  var pElement = div.querySelector('p');

  test.equal(pElement.getAttribute('foo'), 'bar');

  // set the attribute to something else, afterwards check that it
  // hasn't been updated back to the correct value.
  pElement.setAttribute('foo', 'not-bar');
  dep.changed();
  Deps.flush();
  test.equal(pElement.getAttribute('foo'), 'not-bar');
});

// Test that when a helper in an inclusion directive (`{{> foo }}`)
// re-runs due to a dependency changing but the return value is the
// same, the template is not re-rendered.
//
// Also, verify that an error is thrown if the return value from such
// a helper is not a component.
Tinytest.add('spacebars-tests - template_tests - inclusion helpers are isolated', function (test) {
  var tmpl = Template.spacebars_template_test_inclusion_helpers_are_isolated;
  var dep = new Deps.Dependency;
  var subtmpl = Template.spacebars_template_test_inclusion_helpers_are_isolated_subtemplate;
  // make a copy so we can set "rendered" without mutating the original
  var subtmplCopy = Template.__create__(
    subtmpl.__viewName,
    subtmpl.__render);
  var R = new ReactiveVar(subtmplCopy);
  tmpl.foo = function () {
    dep.depend();
    return R.get();
  };

  var div = renderToDiv(tmpl);
    subtmplCopy.rendered = function () {
    test.fail("shouldn't re-render when same value returned from helper");
  };

  dep.changed();
  Deps.flush({_throwFirstError: true}); // `subtmplCopy.rendered` not called

  R.set(null);
  Deps.flush({_throwFirstError: true}); // no error thrown

  R.set("neither a component nor null");

  test.throws(function () {
    Deps.flush({_throwFirstError: true});
  }, /Expected template or null/);
});

Tinytest.add('spacebars-tests - template_tests - nully attributes', function (test) {
  var tmpls = {
    0: Template.spacebars_template_test_nully_attributes0,
    1: Template.spacebars_template_test_nully_attributes1,
    2: Template.spacebars_template_test_nully_attributes2,
    3: Template.spacebars_template_test_nully_attributes3,
    4: Template.spacebars_template_test_nully_attributes4,
    5: Template.spacebars_template_test_nully_attributes5,
    6: Template.spacebars_template_test_nully_attributes6
  };

  var run = function (whichTemplate, data, expectTrue) {
    var div = renderToDiv(tmpls[whichTemplate], data);
    var input = div.querySelector('input');
    var descr = JSON.stringify([whichTemplate, data, expectTrue]);
    if (expectTrue) {
      test.isTrue(input.checked, descr);
      test.equal(typeof input.getAttribute('stuff'), 'string', descr);
    } else {
      test.isFalse(input.checked);
      test.equal(JSON.stringify(input.getAttribute('stuff')), 'null', descr);
    }

    var html = Blaze.toHTML(Blaze.With(data, function () {
      return tmpls[whichTemplate];
    }));

    test.equal(/ checked="[^"]*"/.test(html), !! expectTrue);
    test.equal(/ stuff="[^"]*"/.test(html), !! expectTrue);
  };

  run(0, {}, true);

  var truthies = [true, ''];
  var falsies = [false, null, undefined];

  _.each(truthies, function (x) {
    run(1, {foo: x}, true);
  });
  _.each(falsies, function (x) {
    run(1, {foo: x}, false);
  });

  _.each(truthies, function (x) {
    _.each(truthies, function (y) {
      run(2, {foo: x, bar: y}, true);
    });
    _.each(falsies, function (y) {
      run(2, {foo: x, bar: y}, true);
    });
  });
  _.each(falsies, function (x) {
    _.each(truthies, function (y) {
      run(2, {foo: x, bar: y}, true);
    });
    _.each(falsies, function (y) {
      run(2, {foo: x, bar: y}, false);
    });
  });

  run(3, {foo: true}, false);
  run(3, {foo: false}, false);
});

Tinytest.add("spacebars-tests - template_tests - double", function (test) {
  var tmpl = Template.spacebars_template_test_double;

  var run = function (foo, expectedResult) {
    tmpl.foo = foo;
    var div = renderToDiv(tmpl);
    test.equal(canonicalizeHtml(div.innerHTML), expectedResult);
  };

  run('asdf', 'asdf');
  run(1.23, '1.23');
  run(0, '0');
  run(true, 'true');
  run(false, '');
  run(null, '');
  run(undefined, '');
});

Tinytest.add("spacebars-tests - template_tests - inclusion lookup order", function (test) {
  // test that {{> foo}} looks for a helper named 'foo', then a
  // template named 'foo', then a 'foo' field in the data context.
  var tmpl = Template.spacebars_template_test_inclusion_lookup;
  var tmplData = function () {
    return {
      // shouldn't have an effect since we define a helper with the
      // same name.
      spacebars_template_test_inclusion_lookup_subtmpl: Template.
        spacebars_template_test_inclusion_lookup_subtmpl3,
      dataContextSubtmpl: Template.
        spacebars_template_test_inclusion_lookup_subtmpl3};
  };

  tmpl.spacebars_template_test_inclusion_lookup_subtmpl =
    Template.spacebars_template_test_inclusion_lookup_subtmpl2;

  test.equal(canonicalizeHtml(renderToDiv(tmpl, tmplData).innerHTML),
    ["This is generated by a helper with the same name.",
     "This is a template passed in the data context."].join(' '));
});

Tinytest.add("spacebars-tests - template_tests - content context", function (test) {
  var tmpl = Template.spacebars_template_test_content_context;
  var R = ReactiveVar(true);
  tmpl.foo = {
    firstLetter: 'F',
    secondLetter: 'O',
    bar: {
      cond: function () { return R.get(); },
      firstLetter: 'B',
      secondLetter: 'A'
    }
  };

  var div = renderToDiv(tmpl);
  test.equal(canonicalizeHtml(div.innerHTML), 'BO');
  R.set(false);
  Deps.flush();
  test.equal(canonicalizeHtml(div.innerHTML), 'FA');
});

_.each(['textarea', 'text', 'password', 'submit', 'button',
        'reset', 'select', 'hidden'], function (type) {
  Tinytest.add("spacebars-tests - template_tests - controls - " + type, function(test) {
    var R = ReactiveVar({x:"test"});
    var R2 = ReactiveVar("");
    var tmpl;

    if (type === 'select') {
      tmpl = Template.spacebars_test_control_select;
      tmpl.options = ['This is a test', 'This is a fridge',
                      'This is a frog', 'This is a new frog', 'foobar',
                      'This is a photograph', 'This is a monkey',
                      'This is a donkey'];
      tmpl.selected = function () {
        R2.get();  // Re-render when R2 is changed, even though it
                   // doesn't affect HTML.
        return ('This is a ' + R.get().x) === this.toString();
      };
    } else if (type === 'textarea') {
      tmpl = Template.spacebars_test_control_textarea;
      tmpl.value = function () {
        R2.get();  // Re-render when R2 is changed, even though it
                   // doesn't affect HTML.
        return 'This is a ' + R.get().x;
      };
    } else {
      tmpl = Template.spacebars_test_control_input;
      tmpl.value = function () {
        R2.get();  // Re-render when R2 is changed, even though it
                   // doesn't affect HTML.
        return 'This is a ' + R.get().x;
      };
      tmpl.type = type;
    };

    var div = renderToDiv(tmpl);
    document.body.appendChild(div);
    var canFocus = (type !== 'hidden');

    // find first element child, ignoring any marker nodes
    var input = div.firstChild;
    while (input.nodeType !== 1)
      input = input.nextSibling;

    if (type === 'textarea' || type === 'select') {
      test.equal(input.nodeName, type.toUpperCase());
    } else {
      test.equal(input.nodeName, 'INPUT');
      test.equal(input.type, type);
    }
    test.equal(DomUtils.getElementValue(input), "This is a test");

    // value updates reactively
    R.set({x:"fridge"});
    Deps.flush();
    test.equal(DomUtils.getElementValue(input), "This is a fridge");

    if (canFocus) {
      // ...if focused, it still updates but focus isn't lost.
      focusElement(input);
      DomUtils.setElementValue(input, "something else");
      R.set({x:"frog"});

      Deps.flush();
      test.equal(DomUtils.getElementValue(input), "This is a frog");
      test.equal(document.activeElement, input);
    }

    // Setting a value (similar to user typing) should prevent value from being
    // reverted if the div is re-rendered but the rendered value (ie, R) does
    // not change.
    DomUtils.setElementValue(input, "foobar");
    R2.set("change");
    Deps.flush();
    test.equal(DomUtils.getElementValue(input), "foobar");

    // ... but if the actual rendered value changes, that should take effect.
    R.set({x:"photograph"});
    Deps.flush();
    test.equal(DomUtils.getElementValue(input), "This is a photograph");

    document.body.removeChild(div);
  });
});

Tinytest.add("spacebars-tests - template_tests - radio", function(test) {
  var R = ReactiveVar("");
  var R2 = ReactiveVar("");
  var change_buf = [];
  var tmpl = Template.spacebars_test_control_radio;
  tmpl.bands = ["AM", "FM", "XM"];
  tmpl.isChecked = function () {
    return R.get() === this.toString();
  };
  tmpl.band = function () {
    return R.get();
  };
  tmpl.events({
    'change input': function (event) {
      var btn = event.target;
      var band = btn.value;
      change_buf.push(band);
      R.set(band);
    }
  });

  var div = renderToDiv(tmpl);
  document.body.appendChild(div);

  // get the three buttons; they should not change identities!
  var btns = nodesToArray(div.getElementsByTagName("INPUT"));
  var text = function () {
    var text = div.innerText || div.textContent;
    return text.replace(/[ \n\r]+/g, " ");
  };

  test.equal(_.pluck(btns, 'checked'), [false, false, false]);
  test.equal(text(), "Band: ");

  clickIt(btns[0]);
  test.equal(change_buf, ['AM']);
  change_buf.length = 0;
  Deps.flush();
  test.equal(_.pluck(btns, 'checked'), [true, false, false]);
  test.equal(text(), "Band: AM");

  R2.set("change");
  Deps.flush();
  test.length(change_buf, 0);
  test.equal(_.pluck(btns, 'checked'), [true, false, false]);
  test.equal(text(), "Band: AM");

  clickIt(btns[1]);
  test.equal(change_buf, ['FM']);
  change_buf.length = 0;
  Deps.flush();
  test.equal(_.pluck(btns, 'checked'), [false, true, false]);
  test.equal(text(), "Band: FM");

  clickIt(btns[2]);
  test.equal(change_buf, ['XM']);
  change_buf.length = 0;
  Deps.flush();
  test.equal(_.pluck(btns, 'checked'), [false, false, true]);
  test.equal(text(), "Band: XM");

  clickIt(btns[1]);
  test.equal(change_buf, ['FM']);
  change_buf.length = 0;
  Deps.flush();
  test.equal(_.pluck(btns, 'checked'), [false, true, false]);
  test.equal(text(), "Band: FM");

  document.body.removeChild(div);
});

Tinytest.add("spacebars-tests - template_tests - checkbox", function(test) {
  var tmpl = Template.spacebars_test_control_checkbox;
  tmpl.labels = ["Foo", "Bar", "Baz"];
  var Rs = {};
  _.each(tmpl.labels, function (label) {
    Rs[label] = ReactiveVar(false);
  });
  tmpl.isChecked = function () {
    return Rs[this.toString()].get();
  };
  var changeBuf = [];

  var div = renderToDiv(tmpl);
  document.body.appendChild(div);

  var boxes = nodesToArray(div.getElementsByTagName("INPUT"));

  test.equal(_.pluck(boxes, 'checked'), [false, false, false]);

  // Re-render with first one checked.
  Rs.Foo.set(true);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [true, false, false]);

  // Re-render with first one unchecked again.
  Rs.Foo.set(false);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [false, false, false]);

  // User clicks the second one.
  clickElement(boxes[1]);
  test.equal(_.pluck(boxes, 'checked'), [false, true, false]);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [false, true, false]);

  // Re-render with third one checked. Second one should stay checked because
  // it's a user update!
  Rs.Baz.set(true);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [false, true, true]);

  // User turns second and third off.
  clickElement(boxes[1]);
  clickElement(boxes[2]);
  test.equal(_.pluck(boxes, 'checked'), [false, false, false]);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [false, false, false]);

  // Re-render with first one checked. Third should stay off because it's a user
  // update!
  Rs.Foo.set(true);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [true, false, false]);

  // Re-render with first one unchecked. Third should still stay off.
  Rs.Foo.set(false);
  Deps.flush();
  test.equal(_.pluck(boxes, 'checked'), [false, false, false]);

  document.body.removeChild(div);
});

Tinytest.add('spacebars-tests - template_tests - unfound template', function (test) {
  test.throws(function () {
    renderToDiv(Template.spacebars_test_nonexistent_template);
  }, /No such template/);
});

Tinytest.add('spacebars-tests - template_tests - helper passed to #if called exactly once when invalidated', function (test) {
  var tmpl = Template.spacebars_test_if_helper;

  var count = 0;
  var d = new Deps.Dependency;
  tmpl.foo = function () {
    d.depend();
    count++;
    return foo;
  };

  foo = false;
  var div = renderToDiv(tmpl);
  divRendersTo(test, div, "false");
  test.equal(count, 1);

  foo = true;
  d.changed();
  divRendersTo(test, div, "true");
  test.equal(count, 2);
});

Tinytest.add('spacebars-tests - template_tests - custom block helper functions called exactly once when invalidated', function (test) {
  var tmpl = Template.spacebars_test_block_helper_function;

  var count = 0;
  var d = new Deps.Dependency;
  tmpl.foo = function () {
    d.depend();
    count++;
    return Template.spacebars_template_test_aaa;
  };

  foo = false;
  renderToDiv(tmpl);
  Deps.flush();
  test.equal(count, 1);

  foo = true;
  d.changed();
  Deps.flush();
  test.equal(count, 2);
});

var runOneTwoTest = function (test, subTemplateName, optionsData) {
  _.each([Template.spacebars_test_helpers_stop_onetwo,
          Template.spacebars_test_helpers_stop_onetwo_attribute],
         function (tmpl) {

           tmpl.one = Template[subTemplateName + '1'];
           tmpl.two = Template[subTemplateName + '2'];

           var buf = '';

           var showOne = ReactiveVar(true);
           var dummy = ReactiveVar(0);

           tmpl.showOne = function () { return showOne.get(); };
           tmpl.one.options = function () {
             var x = dummy.get();
             buf += '1';
             if (optionsData)
               return optionsData[x];
             else
               return ['something'];
           };
           tmpl.two.options = function () {
             var x = dummy.get();
             buf += '2';
             if (optionsData)
               return optionsData[x];
             else
               return ['something'];
           };

           var div = renderToDiv(tmpl);
           Deps.flush();
           test.equal(buf, '1');

           showOne.set(false);
           dummy.set(1);
           Deps.flush();
           test.equal(buf, '12');

           showOne.set(true);
           dummy.set(2);
           Deps.flush();
           test.equal(buf, '121');

           // clean up the div
           $(div).remove();
           test.equal(showOne.numListeners(), 0);
           test.equal(dummy.numListeners(), 0);
         });
};

Tinytest.add('spacebars-tests - template_tests - with stops without re-running helper', function (test) {
  runOneTwoTest(test, 'spacebars_test_helpers_stop_with');
});

Tinytest.add('spacebars-tests - template_tests - each stops without re-running helper', function (test) {
  runOneTwoTest(test, 'spacebars_test_helpers_stop_each');
});

Tinytest.add('spacebars-tests - template_tests - each inside with stops without re-running helper', function (test) {
  runOneTwoTest(test, 'spacebars_test_helpers_stop_with_each');
});

Tinytest.add('spacebars-tests - template_tests - if stops without re-running helper', function (test) {
  runOneTwoTest(test, 'spacebars_test_helpers_stop_if', ['a', 'b', 'a']);
});

Tinytest.add('spacebars-tests - template_tests - unless stops without re-running helper', function (test) {
  runOneTwoTest(test, 'spacebars_test_helpers_stop_unless', ['a', 'b', 'a']);
});

Tinytest.add('spacebars-tests - template_tests - inclusion stops without re-running function', function (test) {
  var t = Template.spacebars_test_helpers_stop_inclusion3;
  runOneTwoTest(test, 'spacebars_test_helpers_stop_inclusion', [t, t, t]);
});

Tinytest.add('spacebars-tests - template_tests - template with callbacks inside with stops without recalculating data', function (test) {
  var tmpl = Template.spacebars_test_helpers_stop_with_callbacks3;
  tmpl.created = function () {};
  tmpl.rendered = function () {};
  tmpl.destroyed = function () {};
  runOneTwoTest(test, 'spacebars_test_helpers_stop_with_callbacks');
});

Tinytest.add('spacebars-tests - template_tests - no data context is seen as an empty object', function (test) {
  var tmpl = Template.spacebars_test_no_data_context;

  var dataInHelper = 'UNSET';
  var dataInRendered = 'UNSET';
  var dataInCreated = 'UNSET';
  var dataInDestroyed = 'UNSET';
  var dataInEvent = 'UNSET';

  tmpl.foo = function () {
    dataInHelper = this;
  };
  tmpl.created = function () {
    dataInCreated = this.data;
  };
  tmpl.rendered = function () {
    dataInRendered = this.data;
  };
  tmpl.destroyed = function () {
    dataInDestroyed = this.data;
  };
  tmpl.events({
    'click': function () {
      dataInEvent = this;
    }
  });

  var div = renderToDiv(tmpl);
  document.body.appendChild(div);
  clickElement(div.querySelector('button'));
  Deps.flush(); // rendered gets called afterFlush
  $(div).remove();

  test.isFalse(dataInHelper === window);
  test.equal(dataInHelper, {});
  test.equal(dataInCreated, null);
  test.equal(dataInRendered, null);
  test.equal(dataInDestroyed, null);
  test.isFalse(dataInEvent === window);
  test.equal(dataInEvent, {});
});

Tinytest.add('spacebars-tests - template_tests - falsy with', function (test) {
  var tmpl = Template.spacebars_test_falsy_with;
  var R = ReactiveVar(null);
  tmpl.obj = function () { return R.get(); };

  var div = renderToDiv(tmpl);
  divRendersTo(test, div, "");

  R.set({greekLetter: 'alpha'});
  divRendersTo(test, div, "alpha");

  R.set(null);
  divRendersTo(test, div, "");

  R.set({greekLetter: 'alpha'});
  divRendersTo(test, div, "alpha");
});

Tinytest.add("spacebars-tests - template_tests - helpers don't leak", function (test) {
  var tmpl = Template.spacebars_test_helpers_dont_leak;
  tmpl.foo = "wrong";
  tmpl.bar = function () { return "WRONG"; };

  // Also test that custom block helpers (implemented as templates) do NOT
  // interfere with helper lookup in the current template
  Template.spacebars_test_helpers_dont_leak2.bonus =
    function () { return 'BONUS'; };

  var div = renderToDiv(tmpl);
  divRendersTo(test, div, "correct BONUS");
});

Tinytest.add("spacebars-tests - template_tests - event handler returns false",
  function (test) {
    var tmpl = Template.spacebars_test_event_returns_false;
    var elemId = "spacebars_test_event_returns_false_link";
    tmpl.events({
      'click a': function (evt) { return false; }
    });

    var div = renderToDiv(tmpl);
    document.body.appendChild(div);
    clickIt(document.getElementById(elemId));
    // NOTE: This failure can stick across test runs!  Try
    // removing '#bad-url' from the location bar and run
    // the tests again. :)
    test.isFalse(/#bad-url/.test(window.location.hash));
    document.body.removeChild(div);
  }
);

// Make sure that if you bind an event on "div p", for example,
// both the div and the p need to be in the template.  jQuery's
// `$(elem).find(...)` works this way, but the browser's
// querySelector doesn't.
Tinytest.add(
  "spacebars-tests - template_tests - event map selector scope",
  function (test) {
    var tmpl = Template.spacebars_test_event_selectors1;
    var tmpl2 = Template.spacebars_test_event_selectors2;
    var buf = [];
    tmpl2.events({
      'click div p': function (evt) { buf.push(evt.currentTarget.className); }
    });

    var div = renderToDiv(tmpl);
    document.body.appendChild(div);
    test.equal(buf.join(), '');
    clickIt(div.querySelector('.p1'));
    test.equal(buf.join(), '');
    clickIt(div.querySelector('.p2'));
    test.equal(buf.join(), 'p2');
    document.body.removeChild(div);
  }
);

if (document.addEventListener) {
  // see note about non-bubbling events in the "capuring events"
  // templating test for why we use the VIDEO tag.  (It would be
  // nice to get rid of the network dependency, though.)
  // We skip this test in IE 8.
  Tinytest.add(
    "spacebars-tests - template_tests - event map selector scope (capturing)",
    function (test) {
      var tmpl = Template.spacebars_test_event_selectors_capturing1;
      var tmpl2 = Template.spacebars_test_event_selectors_capturing2;
      var buf = [];
      tmpl2.events({
        'play div video': function (evt) { buf.push(evt.currentTarget.className); }
      });

      var div = renderToDiv(tmpl);
      document.body.appendChild(div);
      test.equal(buf.join(), '');
      simulateEvent(div.querySelector(".video1"),
                    "play", {}, {bubbles: false});
      test.equal(buf.join(), '');
      simulateEvent(div.querySelector(".video2"),
                    "play", {}, {bubbles: false});
      test.equal(buf.join(), 'video2');
      document.body.removeChild(div);
    }
  );
}

Tinytest.add("spacebars-tests - template_tests - tables", function (test) {
  var tmpl1 = Template.spacebars_test_tables1;

  var div = renderToDiv(tmpl1);
  test.equal(_.pluck(div.querySelectorAll('*'), 'tagName'),
             ['TABLE', 'TR', 'TD']);
  divRendersTo(test, div, '<table><tr><td>Foo</td></tr></table>');

  var tmpl2 = Template.spacebars_test_tables2;
  tmpl2.foo = 'Foo';
  div = renderToDiv(tmpl2);
  test.equal(_.pluck(div.querySelectorAll('*'), 'tagName'),
             ['TABLE', 'TR', 'TD']);
  divRendersTo(test, div, '<table><tr><td>Foo</td></tr></table>');
});

Tinytest.add("spacebars-tests - template_tests - jQuery.trigger extraParameters are passed to the event callback",
  function (test) {
    var tmpl = Template.spacebars_test_jquery_events;
    var captured = false;
    var args = ["param1", "param2", {option: 1}, 1, 2, 3];

    tmpl.events({
      'someCustomEvent': function (event, template) {
        var i;
        for (i=0; i<args.length; i++) {
          // expect the arguments to be just after template
          test.equal(arguments[i+2], args[i]);
        }
        captured = true;
      }
    });

    tmpl.rendered = function () {
      $(this.find('button')).trigger('someCustomEvent', args);
    };

    renderToDiv(tmpl);
    Deps.flush();
    test.equal(captured, true);
  }
);

Tinytest.add("spacebars-tests - template_tests - toHTML", function (test) {
  // run once, verifying that autoruns are stopped
  var once = function (tmplToRender, tmplForHelper, helper, val) {
    var count = 0;
    var R = new ReactiveVar;
    var getR = function () {
      count++;
      return R.get();
    };

    R.set(val);
    tmplForHelper[helper] = getR;
    test.equal(canonicalizeHtml(Blaze.toHTML(tmplToRender)), "bar");
    test.equal(count, 1);
    R.set("");
    Deps.flush();
    test.equal(count, 1); // all autoruns stopped
  };

  once(Template.spacebars_test_tohtml_basic,
       Template.spacebars_test_tohtml_basic, "foo", "bar");
  once(Template.spacebars_test_tohtml_if,
       Template.spacebars_test_tohtml_if, "foo", "bar");
  once(Template.spacebars_test_tohtml_with,
       Template.spacebars_test_tohtml_with, "foo", "bar");
  once(Template.spacebars_test_tohtml_each,
       Template.spacebars_test_tohtml_each, "foos", ["bar"]);

  once(Template.spacebars_test_tohtml_include_with,
       Template.spacebars_test_tohtml_with, "foo", "bar");
  once(Template.spacebars_test_tohtml_include_each,
       Template.spacebars_test_tohtml_each, "foos", ["bar"]);
});

Tinytest.add("spacebars-tests - template_tests - block comments should not be displayed",
  function (test) {
    var tmpl = Template.spacebars_test_block_comment;
    var div = renderToDiv(tmpl);
    test.equal(canonicalizeHtml(div.innerHTML), '');
  }
);

// Originally reported at https://github.com/meteor/meteor/issues/2046
Tinytest.add("spacebars-tests - template_tests - {{#with}} with mutated data context",
  function (test) {
    var tmpl = Template.spacebars_test_with_mutated_data_context;
    var foo = {value: 0};
    var dep = new Deps.Dependency;
    tmpl.foo = function () {
      dep.depend();
      return foo;
    };

    var div = renderToDiv(tmpl);
    test.equal(canonicalizeHtml(div.innerHTML), '0');

    foo.value = 1;
    dep.changed();
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), '1');
  });

Tinytest.add("spacebars-tests - template_tests - javascript scheme urls",
  function (test) {
    var tmpl = Template.spacebars_test_url_attribute;
    var sessionKey = "foo-" + Random.id();
    tmpl.foo = function () {
      return Session.get(sessionKey);
    };

    var numUrlAttrs = 4;
    var div = renderToDiv(tmpl);

    // [tag name, attr name, is a url attribute]
    var attrsList = [["A", "href", true], ["FORM", "action", true],
                     ["IMG", "src", true], ["INPUT", "value", false]];

    var checkAttrs = function (url, isJavascriptProtocol) {
      if (isJavascriptProtocol) {
        Meteor._suppress_log(numUrlAttrs);
      }
      Session.set(sessionKey, url);
      Deps.flush();
      _.each(
        attrsList,
        function (attrInfo) {
          var normalizedUrl;
          var elem = document.createElement(attrInfo[0]);
          try {
            elem[attrInfo[1]] = url;
          } catch (err) {
            // IE throws an exception if you set an img src to a
            // javascript: URL. Blaze can't override this behavior;
            // whether you've called UI._javascriptUrlsAllowed() or not,
            // you won't be able to set a javascript: URL in an img
            // src. So we only test img tags in other browsers.
            if (attrInfo[0] === "IMG") {
              return;
            }
            throw err;
          }
          document.body.appendChild(elem);
          normalizedUrl = elem[attrInfo[1]];
          document.body.removeChild(elem);

          _.each(
            div.getElementsByTagName(attrInfo[0]),
            function (elem) {
              test.equal(
                elem[attrInfo[1]],
                isJavascriptProtocol && attrInfo[2] ? "" : normalizedUrl
              );
            }
          );
        }
      );
    };

    test.equal(UI._javascriptUrlsAllowed(), false);
    checkAttrs("http://www.meteor.com", false);
    checkAttrs("javascript:alert(1)", true);
    checkAttrs("jAvAsCrIpT:alert(1)", true);
    checkAttrs("    javascript:alert(1)", true);
    UI._allowJavascriptUrls();
    test.equal(UI._javascriptUrlsAllowed(), true);
    checkAttrs("http://www.meteor.com", false);
    checkAttrs("javascript:alert(1)", false);
    checkAttrs("jAvAsCrIpT:alert(1)", false);
    checkAttrs("    javascript:alert(1)", false);
  }
);

Tinytest.add("spacebars-tests - template_tests - event handlers get cleaned up when template is removed",
  function (test) {
    var tmpl = Template.spacebars_test_event_handler_cleanup;
    var subtmpl = Template.spacebars_test_event_handler_cleanup_sub;

    var rv = new ReactiveVar(true);
    tmpl.foo = function () {
      return rv.get();
    };

    subtmpl.events({
      "click/mouseover": function () { }
    });

    var div = renderToDiv(tmpl);

    test.equal(div.$blaze_events["click"].handlers.length, 1);
    test.equal(div.$blaze_events["mouseover"].handlers.length, 1);

    rv.set(false);
    Deps.flush();

    test.equal(div.$blaze_events["click"].handlers.length, 0);
    test.equal(div.$blaze_events["mouseover"].handlers.length, 0);
  }
);

// This test makes sure that Blaze correctly finds the controller
// heirarchy surrounding an element that itself doesn't have a
// controller.
Tinytest.add(
  "spacebars-tests - template_tests - data context in event handlers on elements inside {{#if}}",
  function (test) {
    var tmpl = Template.spacebars_test_data_context_for_event_handler_in_if;
    var data = null;
    tmpl.events({
      'click span': function () {
        data = this;
      }
    });
    var div = renderToDiv(tmpl);
    document.body.appendChild(div);
    clickIt(div.querySelector('span'));
    test.equal(data, {foo: "bar"});
    document.body.removeChild(div);
  });

// https://github.com/meteor/meteor/issues/2156
Tinytest.add(
  "spacebars-tests - template_tests - each with inserts inside autorun",
  function (test) {
    var tmpl = Template.spacebars_test_each_with_autorun_insert;
    var coll = new Meteor.Collection(null);
    var rv = new ReactiveVar;

    tmpl.items = function () {
      return coll.find();
    };

    var div = renderToDiv(tmpl);

    Deps.autorun(function () {
      if (rv.get()) {
        coll.insert({ name: rv.get() });
      }
    });

    rv.set("foo1");
    Deps.flush();
    var firstId = coll.findOne()._id;

    rv.set("foo2");
    Deps.flush();

    test.equal(canonicalizeHtml(div.innerHTML), "foo1 foo2");

    coll.update(firstId, { $set: { name: "foo3" } });
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), "foo3 foo2");
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - ui hooks",
  function (test) {
    var tmpl = Template.spacebars_test_ui_hooks;
    var rv = new ReactiveVar([]);
    tmpl.items = function () {
      return rv.get();
    };

    var div = renderToDiv(tmpl);

    var hooks = [];
    var container = div.querySelector(".test-ui-hooks");

    // Before we attach the ui hooks, put two items in the DOM.
    var origVal = [{ _id: 'foo1' }, { _id: 'foo2' }];
    rv.set(origVal);
    Deps.flush();

    container._uihooks = {
      insertElement: function (n, next) {
        hooks.push("insert");

        // check that the element hasn't actually been added yet
        test.isTrue((! n.parentNode) ||
                    n.parentNode.nodeType === 11 /*DOCUMENT_FRAGMENT_NODE*/);
      },
      removeElement: function (n) {
        hooks.push("remove");
        // check that the element hasn't actually been removed yet
        test.isTrue(n.parentNode === container);
      },
      moveElement: function (n, next) {
        hooks.push("move");
        // check that the element hasn't actually been moved yet
        test.isFalse(n.nextNode === next);
      }
    };

    var testDomUnchanged = function () {
      var items = div.querySelectorAll(".item");
      test.equal(items.length, 2);
      test.equal(canonicalizeHtml(items[0].innerHTML), "foo1");
      test.equal(canonicalizeHtml(items[1].innerHTML), "foo2");
    };

    var newVal = _.clone(origVal);
    newVal.push({ _id: 'foo3' });
    rv.set(newVal);
    Deps.flush();
    test.equal(hooks, ['insert']);
    testDomUnchanged();

    newVal.reverse();
    rv.set(newVal);
    Deps.flush();
    test.equal(hooks, ['insert', 'move']);
    testDomUnchanged();

    newVal = [origVal[0]];
    rv.set(newVal);
    Deps.flush();
    test.equal(hooks, ['insert', 'move', 'remove']);
    testDomUnchanged();
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - ui hooks - nested domranges",
  function (test) {
    var tmpl = Template.spacebars_test_ui_hooks_nested;
    var rv = new ReactiveVar(true);

    tmpl.foo = function () {
      return rv.get();
    };

    var subtmpl = Template.spacebars_test_ui_hooks_nested_sub;
    var uiHookCalled = false;
    subtmpl.rendered = function () {
      this.firstNode.parentNode._uihooks = {
        removeElement: function (node) {
          uiHookCalled = true;
        }
      };
    };

    var div = renderToDiv(tmpl);
    document.body.appendChild(div);
    Deps.flush();

    var htmlBeforeRemove = canonicalizeHtml(div.innerHTML);
    rv.set(false);
    Deps.flush();
    test.isTrue(uiHookCalled);
    var htmlAfterRemove = canonicalizeHtml(div.innerHTML);
    test.equal(htmlBeforeRemove, htmlAfterRemove);
    document.body.removeChild(div);
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - UI._templateInstance from helper",
  function (test) {
    // Set a property on the template instance; check that it's still
    // there from a helper.

    var tmpl = Template.spacebars_test_template_instance_helper;
    var value = Random.id();
    var instanceFromHelper;

    tmpl.created = function () {
      this.value = value;
    };
    tmpl.foo = function () {
      instanceFromHelper = UI._templateInstance();
    };

    var div = renderToDiv(tmpl);
    test.equal(instanceFromHelper.value, value);
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - UI._templateInstance from helper, " +
    "template instance is kept up-to-date",
  function (test) {
    var tmpl = Template.spacebars_test_template_instance_helper;
    var rv = new ReactiveVar("");
    var instanceFromHelper;

    tmpl.foo = function () {
      return UI._templateInstance().data;
    };

    var div = renderToDiv(tmpl, function () { return rv.get(); });
    rv.set("first");
    divRendersTo(test, div, "first");

    rv.set("second");
    Deps.flush();
    divRendersTo(test, div, "second");

    // UI._templateInstance() should throw when called from not within a
    // helper.
    test.throws(function () {
      UI._templateInstance();
    });
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - {{#with}} autorun is cleaned up",
  function (test) {
    var tmpl = Template.spacebars_test_with_cleanup;
    var rv = new ReactiveVar("");
    var helperCalled = false;
    tmpl.foo = function () {
      helperCalled = true;
      return rv.get();
    };

    var div = renderToDiv(tmpl);
    rv.set("first");
    Deps.flush();
    test.equal(helperCalled, true);

    helperCalled = false;
    $(div).find(".test-with-cleanup").remove();

    rv.set("second");
    Deps.flush();
    test.equal(helperCalled, false);
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - UI._parentData from helpers",
  function (test) {
    var childTmpl = Template.spacebars_test_template_parent_data_helper_child;
    var parentTmpl = Template.spacebars_test_template_parent_data_helper;

    var height = new ReactiveVar(0);
    var bar = new ReactiveVar("bar");

    childTmpl.a = ["a"];
    childTmpl.b = function () { return bar.get(); };
    childTmpl.c = ["c"];

    childTmpl.foo = function () {
      return UI._parentData(height.get());
    };

    var div = renderToDiv(parentTmpl);
    test.equal(canonicalizeHtml(div.innerHTML), "d");

    height.set(1);
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), "bar");

    // Test UI._parentData() reactivity

    bar.set("baz");
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), "baz");

    height.set(2);
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), "a");

    height.set(3);
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML), "parent");
  }
);

Tinytest.add(
  "spacebars - SVG <a> elements",
  function (test) {
    if (! document.createElementNS) {
      // IE 8
      return;
    }

    var tmpl = Template.spacebars_test_svg_anchor;
    var div = renderToDiv(tmpl);

    var anchNamespace = $(div).find("a").get(0).namespaceURI;
    test.equal(anchNamespace, "http://www.w3.org/2000/svg");
  }
);

Tinytest.add(
  "spacebars-tests - template_tests - created/rendered/destroyed by each",
  function (test) {
    var outerTmpl =
          Template.spacebars_test_template_created_rendered_destroyed_each;
    var innerTmpl =
          Template.spacebars_test_template_created_rendered_destroyed_each_sub;

    var buf = '';

    innerTmpl.created = function () { buf += 'C' + String(this.data).toLowerCase(); };
    innerTmpl.rendered = function () { buf += 'R' + String(this.data).toLowerCase(); };
    innerTmpl.destroyed = function () { buf += 'D' + String(this.data).toLowerCase(); };

    var R = ReactiveVar([{_id: 'A'}]);

    outerTmpl.items = function () {
      return R.get();
    };

    var div = renderToDiv(outerTmpl);
    divRendersTo(test, div, '<div>A</div>');
    test.equal(buf, 'CaRa');

    R.set([{_id: 'B'}]);
    divRendersTo(test, div, '<div>B</div>');
    test.equal(buf, 'CaRaDaCbRb');

    R.set([{_id: 'C'}]);
    divRendersTo(test, div, '<div>C</div>');
    test.equal(buf, 'CaRaDaCbRbDbCcRc');

    $(div).remove();
    test.equal(buf, 'CaRaDaCbRbDbCcRcDc');
  });

Tinytest.add(
  "spacebars-tests - template_tests - UI.render/UI.insert/UI.remove",
  function (test) {
    var div = document.createElement("DIV");
    document.body.appendChild(div);

    var created = false, rendered = false, destroyed = false;
    var R = ReactiveVar('aaa');

    var tmpl = Template.spacebars_test_ui_render;
    tmpl.greeting = function () { return this.greeting || 'Hello'; };
    tmpl.r = function () { return R.get(); };
    tmpl.created = function () { created = true; };
    tmpl.rendered = function () { rendered = true; };
    tmpl.destroyed = function () { destroyed = true; };

    test.equal([created, rendered, destroyed], [false, false, false]);

    var renderedTmpl = UI.render(tmpl);
    test.equal([created, rendered, destroyed], [true, false, false]);

    UI.insert(renderedTmpl, div);
    // Flush now. We fire the rendered callback in an afterFlush block,
    // to ensure that the DOM is completely updated.
    Deps.flush();
    test.equal([created, rendered, destroyed], [true, true, false]);

    var x = UI.render(tmpl); // can run a second time without throwing
    // note: we'll have clean up `x` below

    var renderedTmpl2;
    UI.insert(renderedTmpl2 = UI.renderWithData(tmpl, {greeting: 'Bye'}),
              div);
    test.equal(canonicalizeHtml(div.innerHTML),
               "<span>Hello aaa</span><span>Bye aaa</span>");
    R.set('bbb');
    Deps.flush();
    test.equal(canonicalizeHtml(div.innerHTML),
               "<span>Hello bbb</span><span>Bye bbb</span>");
    test.equal([created, rendered, destroyed], [true, true, false]);
    test.equal(R.numListeners(), 3);
    UI.remove(renderedTmpl);
    UI.remove(renderedTmpl2);
    UI.remove(x);
    test.equal([created, rendered, destroyed], [true, true, true]);
    test.equal(R.numListeners(), 0);
    test.equal(canonicalizeHtml(div.innerHTML), "");
  });

Tinytest.add(
  "spacebars-tests - template_tests - UI.insert fails on jQuery objects",
  function (test) {
    var tmpl = Template.spacebars_test_ui_render;
    test.throws(function () {
      UI.insert(UI.render(tmpl), $('body'));
    }, /'parentElement' must be a DOM node/);
    test.throws(function () {
      UI.insert(UI.render(tmpl), document.body, $('body'));
    }, /'nextNode' must be a DOM node/);
  });

Tinytest.add(
  "spacebars-tests - template_tests - UI.getElementData",
  function (test) {
    var div = document.createElement("DIV");
    var tmpl = Template.spacebars_test_ui_getElementData;
    UI.insert(UI.renderWithData(tmpl, {foo: "bar"}), div);

    var span = div.querySelector('SPAN');
    test.isTrue(span);
    test.equal(UI.getElementData(span), {foo: "bar"});
  });

Tinytest.add(
  "spacebars-tests - template_tests - autorun cleanup",
  function (test) {
    var tmpl = Template.spacebars_test_parent_removal;

    var Acalls = '';
    var A = ReactiveVar('hi');
    tmpl.A = function (chr) {
      Acalls += chr;
      return A.get();
    };
    var Bcalls = 0;
    var B = ReactiveVar(['one', 'two']);
    tmpl.B = function () {
      Bcalls++;
      return B.get();
    };

    // Assert how many times A and B were accessed (since last time)
    // and how many autoruns are listening to them.
    var assertCallsAndListeners =
          function (a_calls, b_calls, a_listeners, b_listeners) {
            test.equal('A calls: ' + Acalls.length,
                       'A calls: ' + a_calls,
                       Acalls);
            test.equal('B calls: ' + Bcalls,
                       'B calls: ' + b_calls);
            test.equal('A listeners: ' + A.numListeners(),
                       'A listeners: ' + a_listeners);
            test.equal('B listeners: ' + B.numListeners(),
                       'B listeners: ' + b_listeners);
            Acalls = '';
            Bcalls = 0;
          };

    var div = renderToDiv(tmpl);
    assertCallsAndListeners(10, 1, 10, 1);
    A.set('');
    Deps.flush();
    // Confirm that #4, #5, #6, and #9 are not re-run.
    // #a is newly run, for a total of 10 - 4 + 1 = 7,
    assertCallsAndListeners(7, 0, 7, 1);
    A.set('hi');
    Deps.flush();
    assertCallsAndListeners(10, 0, 10, 1);

    // Now see that removing the DOM with jQuery, below
    // the level of the entire template, stops everything.
    $(div.querySelector('.toremove')).remove();
    assertCallsAndListeners(0, 0, 0, 0);
  });

Tinytest.add(
  "spacebars-tests - template_tests - focus/blur with clean-up",
  function (test) {
    var tmpl = Template.spacebars_test_focus_blur_outer;
    var cond = ReactiveVar(true);
    tmpl.cond = function () {
      return cond.get();
    };
    var buf = [];
    Template.spacebars_test_focus_blur_inner.events({
      'focus input': function () {
        buf.push('FOCUS');
      },
      'blur input': function () {
        buf.push('BLUR');
      }
    });

    var div = renderToDiv(tmpl);
    document.body.appendChild(div);

    // check basic focus and blur to make sure
    // everything is sane
    test.equal(div.querySelectorAll('input').length, 1);
    var input;
    focusElement(input = div.querySelector('input'));
    // We don't get focus events when the Chrome Dev Tools are focused,
    // unfortunately, as of Chrome 35.  I think this is a regression in
    // Chrome 34.  So, the goal is to work whether or not focus is
    // "borken," where "working" means always failing if DOMBackend isn't
    // correctly unbinding the old event handlers when we switch the IF,
    // and always passing if it is.  To cause the problem in DOMBackend,
    // delete the '**' argument to jQuery#off in
    // DOMBackend.Events.undelegateEvents.  The only compromise we are
    // making here is that if some unrelated bug in Blaze makes
    // focus/blur not work, the failure might be masked while the Dev
    // Tools are open.
    var borken = false;
    if (buf.length === 0 && document.activeElement === input) {
      test.ok({note:"You might need to defocus the Chrome Dev Tools to get a more accurate run of this test!"});
      borken = true;
      $(input).trigger('focus');
    }
    test.equal(buf.join(), 'FOCUS');
    blurElement(div.querySelector('input'));
    if (buf.length === 1)
      $(input).trigger('blur');
    test.equal(buf.join(), 'FOCUS,BLUR');

    // now switch the IF and check again.  The failure mode
    // we observed was that DOMBackend would not correctly
    // unbind the old event listener at the jQuery level,
    // so the old event listener would fire and cause an
    // exception inside Blaze ("Must be attached" in
    // DOMRange#containsElement), which would show up in
    // the console and cause our handler not to fire.
    cond.set(false);
    buf.length = 0;
    Deps.flush();
    test.equal(div.querySelectorAll('input').length, 1);
    focusElement(input = div.querySelector('input'));
    if (borken)
      $(input).trigger('focus');
    test.equal(buf.join(), 'FOCUS');
    blurElement(div.querySelector('input'));
    if (! borken)
      test.equal(buf.join(), 'FOCUS,BLUR');

    document.body.removeChild(div);
  });

// We used to remove event handlers on DOMRange detached, but when
// tearing down a view, we don't "detach" all the DOMRanges recursively.
// Mainly, we destroy the View.  Destroying a View should remove its
// event listeners.  (In practice, however, it's hard to think of
// consequences to not removing event handlers on removed DOM nodes,
// which will probably be GCed anyway.)
Tinytest.add(
  "spacebars-tests - template_tests - event cleanup on destroyed",
  function (test) {
    var tmpl = Template.spacebars_test_event_cleanup_on_destroyed_outer;
    var cond = ReactiveVar(true);
    tmpl.cond = function () {
      return cond.get();
    };

    Template.spacebars_test_event_cleanup_on_destroyed_inner.events({
      'click span': function () {}});

    var div = renderToDiv(tmpl);
    document.body.appendChild(div);

    var eventDiv = div.querySelector('div');
    test.equal(eventDiv.$blaze_events.click.handlers.length, 1);

    cond.set(false);
    Deps.flush();
    test.equal(eventDiv.$blaze_events.click.handlers.length, 0);

    document.body.removeChild(div);
  });

_.each([1, 2, 3], function (n) {
  Tinytest.add(
    "spacebars-tests - template_tests - lookup is isolated " + n,
    function (test) {
      var buf = "";
      var inclusion = Template.spacebars_test_isolated_lookup_inclusion;
      inclusion.created = function () { buf += 'C'; };
      inclusion.destroyed = function () { buf += 'D'; };

      var tmpl = Template['spacebars_test_isolated_lookup' + n];
      var R = ReactiveVar(Template.spacebars_template_test_aaa);

      tmpl.bar = function () {
        return R.get();
      };

      var div = renderToDiv(
        tmpl,
        function () {
          return { foo: R.get() };
        });

      test.equal(canonicalizeHtml(div.innerHTML), 'aaa--x');
      test.equal(buf, 'C');
      R.set(Template.spacebars_template_test_bbb);
      Deps.flush();
      test.equal(canonicalizeHtml(div.innerHTML), 'bbb--x');
      test.equal(buf, 'C');
    }
  );
});
