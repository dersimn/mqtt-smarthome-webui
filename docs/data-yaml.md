# data.yaml Reference

This document describes all available options for the `data.yaml` configuration file used by mqtt-smarthome-webui.

## File Structure

The file is YAML and has a single root key `pages`, which is a list of page objects.

```yaml
---
pages:
  - pageid: mainpage
    pagetitle: My Smart Home
    sections:
      - sectiontitle: Living Room
        items:
          - title: Ceiling Light
            type: switch
            topic: lights//ceiling
```

---

## Pages

Each entry in `pages` defines a full-screen view reachable via navigation.

| Property | Type | Required | Description |
|---|---|---|---|
| `pageid` | string | Yes | Unique identifier used as the URL hash (e.g. `#mainpage`). The page with `pageid: mainpage` is the default landing page and shows no back button. |
| `pagetitle` | string | Yes | Text displayed in the navigation bar. |
| `pageicon` | string | No | Path to an image file shown as a logo in the navigation bar (e.g. `icon.png`). |
| `sections` | list | Yes | List of [section](#sections) objects. |

---

## Sections

Sections visually group items within a page.

| Property | Type | Required | Description |
|---|---|---|---|
| `sectiontitle` | string | No | Heading displayed above the group of items. Omit to render items without a heading. |
| `items` | list | Yes | List of [item](#items) objects. |

---

## Items

Items are the individual controls displayed within a section. Every item must have a `type` field. The available fields depend on the type.

### Common fields

These fields apply to all item types unless noted otherwise.

| Property | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Control type. One of: `text`, `switch`, `slider`, `select`, `button`, `number`, `html`. |
| `title` | string | Yes* | Label displayed next to the control. *Not used by the `html` type. |
| `topic` | string or object | Yes* | MQTT topic(s). See [Topic syntax](#topic-syntax). *Not used by the `html` type. |
| `icon` | string | No | Path to an image shown left of the title (e.g. `icons/bulb.png`). |
| `link` | string | No | Hash-based navigation target rendered as a chevron link (e.g. `#detailpage`). |
| `transform` | string or object | No | JavaScript expression(s) applied to incoming/outgoing values. See [Transforms](#transforms). |
| `options` | object | No | Additional options. See [Options](#options). |

---

## Topic syntax

### Shorthand string with `//`

Use a double-slash as a separator. The string is automatically split into a get topic (using `/status/`) and a set topic (using `/set/`):

```yaml
topic: hue//1
# Equivalent to:
#   get: hue/status/1
#   set: hue/set/1
```

### Plain string (read-only)

A string without `//` is treated as a get-only topic. The item cannot publish.

```yaml
topic: sensor/temperature
# Equivalent to:
#   get: sensor/temperature
#   set: null  (read-only)
```

### Explicit object

Use this when the get and set topics are different or when you only need one direction.

```yaml
topic:
  get: hm/status/device/1/TEMPERATURE   # Topic to subscribe and display
  set: hm/set/device/1/TEMPERATURE      # Topic to publish on user interaction

# Publish-only (no display):
topic:
  set: system/command
```

---

## Transforms

Transforms are JavaScript code snippets executed at runtime to convert values before display (`get`) or before publishing (`set`). They run inside `new Function(...)` with no access to external state.

### Single string — applies to `get` only

```yaml
transform: return Number(value).toFixed(1) + ' °C'
```

Available variables for `get` transforms:

| Variable | Description |
|---|---|
| `topic` | The MQTT topic string. |
| `message` | The full MQTT message (may be an object with a `val` property). |
| `value` | The resolved scalar value: `message.val` when it exists, otherwise `message`. |

### Object — separate `get` and `set`

```yaml
transform:
  get: return Number(value).toFixed(1) + ' °C'
  set: return JSON.stringify({ hue: 15.9/360, sat: 1, val: Number(input) })
```

Available variables for `set` transforms:

| Variable | Description |
|---|---|
| `input` | The raw value produced by the control (e.g. the slider position, the typed number). |

**Returning `null` from a `get` transform** suppresses the update — the displayed value is not changed.

---

## Options

The `options` object holds miscellaneous settings.

```yaml
options:
  mqtt:
    retain: true    # Publish messages with the MQTT retain flag
  left-increment: -0.5   # Step used by the left button of a `number` item
  right-increment: 0.5   # Step used by the right button of a `number` item
```

| Property | Applies to | Type | Default | Description |
|---|---|---|---|---|
| `mqtt.retain` | all controllable types | boolean | `false` | When `true`, messages are published with the MQTT retain flag. |
| `left-increment` | `number` | number | `-1` | Amount added to the current value when the left (−) button is clicked. |
| `right-increment` | `number` | number | `1` | Amount added to the current value when the right (+) button is clicked. |

---

## Item types

### `text`

Displays a read-only value received from an MQTT topic.

```yaml
- title: Temperature
  type: text
  topic: sensor/temperature
  transform: return Number(value).toFixed(1) + ' °C'
```

Accepts boolean, string, and number values. Object values are ignored. When combined with `link`, a chevron arrow is rendered and the item acts as a navigation link.

---

### `switch`

A toggle switch for boolean values.

```yaml
- title: Ceiling Light
  type: switch
  topic: lights//ceiling
  icon: icons/bulb.png
```

- Subscribes to `topic.get` and checks the switch when the received value is `true`.
- Publishes the boolean `checked` state to `topic.set` on click.
- Ignores non-boolean incoming values.

---

### `slider`

A horizontal range slider for numeric values.

```yaml
- title: Brightness
  type: slider
  topic: lights//brightness
  sliderMinValue: 0
  sliderMaxValue: 255
  sliderStepValue: 5
```

| Property | Type | Default | Description |
|---|---|---|---|
| `sliderMinValue` | number | `0` | Minimum value of the slider. |
| `sliderMaxValue` | number | `1` | Maximum value of the slider. |
| `sliderStepValue` | number or `'any'` | `'any'` | Step increment. Use `'any'` for continuous movement. |

- Publishes on `change` (when the thumb is released), not on every movement.
- Ignores `NaN` incoming values.

---

### `select`

A dropdown menu.

```yaml
- title: Heating Mode
  type: select
  topic: thermostat//mode
  selectOptions:
    - label: 'Off'
      value: '0'
    - label: Comfort
      value: '1'
    - label: Eco
      value: '2'
```

| Property | Type | Required | Description |
|---|---|---|---|
| `selectOptions` | list | Yes | List of option objects, each with a `label` (displayed text) and a `value` (published to MQTT). |

- After the user picks an option, the dropdown reverts to the last known MQTT value and shows a loading indicator until the broker confirms the change.

---

### `button`

One or more action buttons.

```yaml
- title: Scene
  type: button
  topic:
    set: lights/scene
  buttons:
    - label: Relax
      value: relax
    - label: Movie
      value: movie
```

| Property | Type | Required | Description |
|---|---|---|---|
| `buttons` | list | Yes | List of button objects, each with a `label` (button text) and a `value` (published to MQTT on click). |

- When `topic.get` is provided, the button whose `value` matches the current MQTT value is highlighted as active.

---

### `number`

A numeric input with decrement and increment buttons.

```yaml
- title: Set Temperature
  type: number
  topic: thermostat//setpoint
  options:
    left-increment: -0.5
    right-increment: 0.5
```

- The left (−) and right (+) buttons add `left-increment` / `right-increment` to the current input value and publish the result.
- The user can also type directly into the input field; the value is published on blur/enter.
- Incoming values update the field only when no user edit is pending.

---

### `html`

Renders arbitrary HTML. No MQTT interaction.

```yaml
- type: html
  html: >
    <div class="list-group-item">
      <p>Custom content here.</p>
    </div>
```

| Property | Type | Required | Description |
|---|---|---|---|
| `html` | string | Yes | Raw HTML inserted directly into the page. |

Use the YAML block scalars `>` (folded) or `|` (literal) for multi-line HTML.

---

## Full example

```yaml
---
pages:
  - pageid: mainpage
    pageicon: icon.png
    pagetitle: Smart Home
    sections:
      - sectiontitle: Lighting
        items:
          - title: Living Room
            type: switch
            topic: lights//living_room
            icon: icons/bulb.png

          - title: Brightness
            type: slider
            topic: lights//brightness
            sliderMinValue: 0
            sliderMaxValue: 255
            sliderStepValue: 5

          - title: Color Scene
            type: select
            topic: lights//scene
            selectOptions:
              - label: Warm
                value: warm
              - label: Cool
                value: cool
              - label: Night
                value: night

      - sectiontitle: Climate
        items:
          - title: Current Temperature
            type: text
            topic: sensor/temperature
            transform: return Number(value).toFixed(1) + ' °C'

          - title: Set Temperature
            type: number
            topic: thermostat//setpoint
            options:
              left-increment: -0.5
              right-increment: 0.5

      - sectiontitle: Actions
        items:
          - title: Alarm
            type: button
            topic:
              set: alarm/command
            buttons:
              - label: Arm
                value: arm
              - label: Disarm
                value: disarm

          - title: Contact Switches
            type: text
            topic: sensors//contacts/count
            link: '#contacts'

          - type: html
            html: >
              <div class="list-group-item text-muted">
                <small>Last updated: <span id="ts">–</span></small>
              </div>

  - pageid: contacts
    pagetitle: Contact Switches
    sections:
      - sectiontitle: Doors
        items:
          - title: Front Door
            type: text
            topic: sensor//door/front/STATE
            transform: 'return value ? "Open" : "Closed"'

      - sectiontitle: Windows
        items:
          - title: Kitchen
            type: text
            topic: sensor//window/kitchen/STATE
            transform: 'return value ? "Open" : "Closed"'
```
