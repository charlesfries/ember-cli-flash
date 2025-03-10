import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
  click,
  find,
  render,
  rerender,
  settled,
  triggerEvent,
} from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import FlashMessage from 'ember-cli-flash/flash/object';
import { next, later } from '@ember/runloop';
import { isDestroyed } from '@ember/destroyable';

const timeoutDefault = 1000;
const TIMEOUT = 50;

module('Integration | Component | flash message', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders a flash message', async function (assert) {
    const flash = new FlashMessage({ message: 'hi', sticky: true });
    this.set('flash', flash);

    await render(hbs`
      <FlashMessage @flash={{this.flash}} as |component flash|>
        {{flash.message}}
      </FlashMessage>
    `);

    assert.dom('*').hasText('hi', 'initial message is displayed');

    flash.message = 'hello';
    await rerender();

    assert.dom('*').hasText('hello', 'updated message is displayed');
  });

  test('it renders with the right props', async function (assert) {
    this.set(
      'flash',
      new FlashMessage({
        message: 'test',
        type: 'test',
        timeout: TIMEOUT,
        extendedTimeout: 5000,
        showProgress: true,
      }),
    );

    render(hbs`
      <FlashMessage @flash={{this.flash}}/>
    `);

    later(
      this,
      () => {
        assert.dom('.alert').hasClass('alert-test');
        assert.strictEqual(
          find('.alert-progressBar').style['transitionDuration'],
          '50ms',
          'it has the right `progressDuration`',
        );
      },
      TIMEOUT - 20,
    ); // Checking for the DOM in between 0 - 50 ms :facepalm: When support for Ember 2.x is dropped, this can be moved as a `next` instead of later.

    await settled();

    assert
      .dom('.alert')
      .hasClass('active', 'it sets `active` to true after rendering');
  });

  test('it does not error when quickly removed from the DOM', async function (assert) {
    this.set('flash', new FlashMessage({ message: 'hi', sticky: true }));
    this.set('flag', true);

    await render(hbs`
      {{#if this.flag}}
        <FlashMessage @flash={{this.flash}} as |component flash|>
          {{flash.message}}
        </FlashMessage>
      {{/if}}
    `);

    this.set('flag', false);

    await settled();
    assert.ok(isDestroyed(this.flash), 'Flash Object isDestroyed');
  });

  test('flash message is removed after timeout', async function (assert) {
    this.set(
      'flash',
      new FlashMessage({
        message: 'hi',
        sticky: false,
        timeout: timeoutDefault,
      }),
    );

    render(hbs`
      <FlashMessage @flash={{this.flash}} as |component flash|>
        {{flash.message}}
      </FlashMessage>
    `);

    later(
      this,
      () => {
        assert.dom('*').hasText('hi');
        assert.notOk(
          isDestroyed(this.flash),
          'Flash is not destroyed immediately',
        );
      },
      timeoutDefault - 100,
    );

    await settled();

    assert.ok(isDestroyed(this.flash), 'Flash Object is destroyed');
  });

  test('flash message is removed after timeout if mouse enters', async function (assert) {
    let flashObject = new FlashMessage({
      message: 'hi',
      sticky: false,
      timeout: timeoutDefault,
    });

    this.set('flash', flashObject);

    render(hbs`
      <FlashMessage id="testFlash" @flash={{this.flash}} as |component flash|>
        {{flash.message}}
      </FlashMessage>
    `);
    // await this.pauseTest();
    later(
      this,
      () => {
        assert.dom('*').hasText('hi');
        triggerEvent('#testFlash', 'mouseenter');

        next(this, () => {
          assert.notOk(
            isDestroyed(flashObject),
            'Flash Object is not destroyed',
          );
          triggerEvent('#testFlash', 'mouseleave');
        });
      },
      timeoutDefault - 100,
    );

    await settled();

    assert.ok(isDestroyed(flashObject), 'Flash Object is destroyed');
  });

  test('a custom component can use the close closure action', async function (assert) {
    this.set(
      'flash',
      new FlashMessage({
        message: 'flash message content',
        sticky: true,
        destroyOnClick: false,
      }),
    );

    await render(hbs`
      <FlashMessage @flash={{this.flash}} as |component flash close|>
        {{flash.message}}
        <a href="#" {{on 'click' close}}>close</a>
      </FlashMessage>
    `);

    assert.notOk(isDestroyed(this.flash), 'flash has not been destroyed yet');

    await click('.alert');
    assert.notOk(isDestroyed(this.flash), 'flash has not been destroyed yet');

    await click('.alert a');
    assert.ok(
      isDestroyed(this.flash),
      'flash is destroyed after clicking close',
    );
  });

  test('exiting class is applied for sticky messages', async function (assert) {
    let flashObject = new FlashMessage({
      message: 'flash message content',
      sticky: true,
      extendedTimeout: 100,
    });

    this.set('flash', flashObject);

    await render(hbs`
      <FlashMessage @flash={{this.flash}} as |component flash|>
        <span>{{flash.message}}</span>
      </FlashMessage>
    `);

    await click('.alert');
    assert.dom('.alert').hasClass('exiting', 'exiting class is applied');
    assert.ok(isDestroyed(flashObject), 'Flash Object is destroyed');
  });

  test('custom message type class name prefix is applied', async function (assert) {
    let flashObject = new FlashMessage({
      message: 'flash message content',
      type: 'test',
      sticky: true,
    });

    this.set('flash', flashObject);
    this.set('messageStylePrefix', 'my-flash-');

    await render(hbs`
      <FlashMessage @flash={{this.flash}} @messageStylePrefix={{this.messageStylePrefix}} as |component flash|>
        <span>{{flash.message}}</span>
      </FlashMessage>
    `);

    assert
      .dom('.my-flash-test')
      .exists(
        { count: 1 },
        'it uses the provided flash type class name prefix',
      );
    assert
      .dom('.my-flash-test')
      .doesNotHaveClass(
        'alert',
        'default flash type class name is not present',
      );
  });
});
