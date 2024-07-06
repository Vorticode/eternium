---
title:  Eternium Documentation
append-head:  <script src="docs/js/ui/DarkToggle.js"></script><script type="module" src="docs/js/documentation.js"></script><link rel="stylesheet" href="docs/media/documentation.css"><link rel="stylesheet" href="eternium.css">
---

<!-- To create documentation: (1) Open in Typora.  (2) Select the GitHub theme. (3) Export as html with styles to index.html. -->

# Eternium

Eternium is a simple, no-JavaScript, compilation-free, single-file, opt-in, responsive CSS library for layout and styling elements, especially forms and complex user interfaces.  It requires less markup than other libraries.  It's currently in beta.

[Download eternium.css](eternium.css) (45KB, 8KB min+gzip)

[GitHub Repository](https://github.com/Vorticode/eternium)

Here's what using Eternium looks like.  Notice that you can edit the code.

```html
<div class="card pad col gap-small stretch-h">
	<b>Form with side Labels</b>
    
	<label class="row center-v stretch-h">
		<span class="px70">Username</span>
		<input/>
	</label>	
    
	<div class="row center-v stretch-h">
		<label class="px70" for="password">
            Password</label>
		<span class="row group">
			<input class="flex1" id="password" 
                   type="password" style="width: 0">
			<button>🔍</button>
		</span>
	</div>
    
	<div class="row stretch-h wrap">
		<div class="px70"><!--spacer--></div>
		<div class="row center-v space-between">
			<label class="no-select">
				<input type="checkbox" checked>
				Remember
			</label>
			<div class="row gap-small">
				<button>Cancel</button>
				<button type="submit" class="primary">
					Submit
				</button>
			</div>
		</div>
	</div>
</div>
```

In this example:

- `row` and `col` classes control the direction children are placed.
- `center-v` and `stretch-h` center vertically and stretch the child element widths to fill available space.
- `pad` and `gap` set the spacing around and between elements.
- `px70` makes an element 70 pixels wide.

Eternium supports both light and dark modes.  Click the moon icon in the top right of this page to cycle between modes.  You can add the `dark` attribute to the root `<html>` element to switch to dark mode.  It can be useful to do this automatically with JavaScript.

To use Eternium, include it in the head of your document, adjusting the path to where you put eternium.css:

`<link rel="stylesheet" href="eternium.css">`

Eternium uses modern CSS features like [nested rules](https://caniuse.com/css-nesting).  It supports desktop and mobile versions Chrome, Brave, Edge, Firefox, and Safari released in **Jan 2024 or later**.

## Layout

Add the `eternium` or the `eternium-layout` class to a parent element, then you can use any of the classes in this Layout seciond.

### Variables

Many classes come in `micro`, `tiny`, `small`, `normal`, `big`, and `huge` variants.  These sizes are defined by corresponding variables, shown below with their default values.  They can be modified in eternium.css or overridden in your own code if you prefer different sizes.

```css
--micro:  2px;
--tiny:   4px;
--small:  8px;
--normal: 16px;
--big:    24px;
--huge:   48px;
```

### Responsive

Eternium layout classes have variants with the `-mobile` `-tablet` and `-desktop` suffix that only apply if the screen width is less than 512px,  between 512px and 992px, or greater than 992px, respectively.  This can be used to use a different layout on mobile, tablets, an desktop.

```css
@media (width < 512px) {          /* Mobile */ }
@media (512px <= width < 992px) { /* Tablet */ }
@media (992px <= width) {         /* Desktop */ }
```

You'll see examples with these below.

### Rows and Columns

| Class  | Responsive Overrides                       |                                    |
| ------ | ------------------------------------------ | ---------------------------------- |
| `.row` | `.row-mobile` `.row-tablet` `.row-desktop` | Children are arranged in a row.    |
| `.col` | `.col-mobile` `.col-tablet` `.col-desktop` | Children are arranged in a column. |

Rows and columns are the main way to control the layout of elements when using Eternium.  Add a row or a column class to an element to arrange its children in a row or a column.

```html
<div class="row">
    <div>Item 1</div>
    <div>Item 2</div>
</div>
```

These items are laid out in a column:

```html
<div class="col">
    <div>Item 1</div>
    <div>Item 2</div>
</div>
```

These are laid out in a column on mobile and desktop, but in a row on tablets - devices with screen widths between 768 and 992px.

```html
<div class="col row-tablet">
    <div>Item 1</div>
    <div>Item 2</div>
</div>
```

### Alignment

Specify the alignment of children within `.row` and `.col` elements.

| <div class="px120-desktop">Class</div> | Responsive Overrides                                         |                                                       |
| -------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| `.left`                                | `.left-mobile` `.left-tablet` `.left-desktop`                | Align children to the left, which is the default.     |
| `.right`                               | `.right-mobile` `.right-tablet` `.right-desktop`             | Align children to the right.                          |
| `.top`                                 | `.top-mobile` `.top-tablet` `.top-desktop`                   | Align children to the top, which is the default.      |
| `.bottom`                              | `.bottom-mobile` `.bottom-tablet` `.bottom-desktop`          | Align children to the bottom.                         |
| `.stretch`                             | `.stretch-mobile` `.stretch-tablet` `.stretch-desktop`       | Stretch children to fill the container.               |
| `.stretch-h`                           | `.stretch-h-mobile` `.stretch-h-tablet` `.stretch-h-desktop` | Stretch children horizontally.                        |
| `.stretch-v`                           | `.stretch-v-mobile` `.stretch-v-tablet` `.stretch-v-desktop` | Stretch children vertically.                          |
| `.space-between`                       | `.space-between-mobile` `.space-between-tablet` `.space-between-desktop` | Distribute children with space between them.          |
| `.space-around`                        | `.space-around-mobile` `.space-around-tablet` `.space-around-desktop` | Distribute children with space around them.           |
| `.space-evenly`                        | `.space-evenly-mobile` `.space-evenly-tablet` `.space-evenly-desktop` | Distribute children evenly.                           |
| `.center`                              | `.center-mobile` `.center-tablet` `.center-desktop`          | Center children.                                      |
| `.center-h`                            | `.center-h-mobile` `.center-h-tablet` `.center-h-desktop`    | Center children horizontally.                         |
| `.center-v`                            | `.center-v-mobile` `.center-v-tablet` `.center-v-desktop`    | Center children vertically.                           |
| `.wrap`                                | `.wrap-mobile` `.wrap-tablet` `.wrap-desktop`                | Wrap children to the next line, which is the default. |
| `.no-wrap`                             | `.no-wrap-mobile` `.no-wrap-tablet` `.no-wrap-desktop`       | Prevent children from wrapping.                       |

```html
<style>
    .row, .col { min-width: 60px; min-height: 60px }
    .box { 
        min-width: 10px; min-height: 10px; 
        border: 1px solid black; 
        background: var(--shade4) 
    }
</style>
<table class="data-table">
    <thead>
        <tr>
            <th></th>
            <th>center-h</th>
            <th>center-v</th>
            <th>center</th>
            <th>right</th>
            <th>bottom</th>
        </tr>
    </thead>
    <tbody>        
        <tr>
            <th>.row</th>
            <td>
                <div class="row center-h">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row center-v">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row center">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row right">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row bottom">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
        </tr>
        <tr>
            <th>.col</th>
            <td>
                <div class="col center-h">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col center-v">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col center">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col right">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col bottom">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
        </tr>
    </tbody>
</table>
<br>
<table class="data-table">
    <thead>
        <tr>
            <th></th>
            <th>stretch-h</th>
            <th>stretch-v</th>
            <th>stretch</th>
            <th>space-between</th>
            <th>space-around</th>
            <th>space-evenly</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th>.row</th>
            <td>
                <div class="row stretch-h">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row stretch-v">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row stretch">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row space-between">
                    <div class="box"></div>
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row space-around">
                    <div class="box"></div>
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="row space-evenly">
                    <div class="box"></div>
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
        </tr>
        <tr>
            <th>.col</th>
            <td>
                <div class="col stretch-h">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col stretch-v">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col stretch">
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col space-between">
                    <div class="box"></div>
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col space-around">
                    <div class="box"></div>
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
            <td>
                <div class="col space-evenly">
                    <div class="box"></div>
                    <div class="box"></div>
                    <div class="box"></div>
                </div>
            </td>
        </tr>
    </tbody>
</table>
```

### Gaps

Specify the gap between the children of `.row` and `.col` elements.

| <div class="px120-desktop">Class</div> | Responsive Overrides                                         |                                                              |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `.gap`                                 | `.gap-mobile` `.gap-tablet` `.gap-desktop`                   | Items will have a gap the size of the `--normal` variable, typically 16px. |
| `.gap-micro`                           | `.gap-micro-mobile` `.gap-micro-tablet` `.gap-micro-desktop` | Items will have a gap the size of the `--micro` variable, typically 2px. |
| `.gap-tiny`                            | `.gap-tiny-mobile` `.gap-tiny-tablet` `.gap-tiny-desktop`    | Items will have a gap the size of the `--tiny` variable, typically 4px. |
| `.gap-small`                           | `.gap-small-mobile` `.gap-small-tablet` `.gap-small-desktop` | Items will have a gap the size of the `--small` variable, typically 8px. |
| `.gap-big`                             | `.gap-big-mobile` `.gap-big-tablet` `.gap-big-desktop`       | Items will have a gap the size of the `--big` variable, typically 24px. |
| `.gap-huge`                            | `.gap-huge-mobile` `.gap-huge-tablet` `.gap-huge-desktop`    | Items will have a gap the size of the `--huge` variable, typically 48px. |

```html
<style>
    .row { background: var(--shade1) }
    .box { 
        min-width: 12px; min-height: 12px; 
        border: 1px solid black; 
        background: var(--shade4) 
    }
</style>
<table class="data-table" style="width: 100%" cellspacing="0">
    <tr>
        <td style="width: 100px">gap-tiny</td>
        <td class="row gap-tiny">
            <div class="box"></div>
            <div class="box"></div>
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>gap-small</td>
        <td class="row gap-small">
            <div class="box"></div>
            <div class="box"></div>
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>gap</td>
        <td class="row gap">
            <div class="box"></div>
            <div class="box"></div>
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>gap-big</td>
        <td class="row gap-big">
            <div class="box"></div>
            <div class="box"></div>
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>gap-huge</td>
        <td class="row gap-huge">
            <div class="box"></div>
            <div class="box"></div>
            <div class="box"></div>
    	</td>
    </tr>
</table>


```

### Padding

Specify the padding of an element.  The `-h` and -`v` variants set horizontal and vertical padding individually.  Unlike with gaps and alignment, this does not have to be applied to a `.row` or `.col` element.


| <div class="px120-desktop">Class</div> | Responsive Overrides                                         | Description                                                  |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `.pad`                                 | `.pad-mobile` `.pad-tablet` `.pad-desktop`                   | Give the element padding the size of the `--normal` variable, typically 16px. |
| `.pad-micro`                           | `.pad-micro-mobile` `.pad-micro-tablet` `.pad-micro-desktop` | Give the element padding the size of the `--micro` variable, typically 2px. |
| `.pad-tiny`                            | `.pad-tiny-mobile` `.pad-tiny-tablet` `.pad-tiny-desktop`    | Give the element padding the size of the `--tiny` variable, typically 4px. |
| `.pad-small`                           | `.pad-small-mobile` `.pad-small-tablet` `.pad-small-desktop` | Give the element padding the size of the `--small` variable, typically 8px. |
| `.pad-big`                             | `.pad-big-mobile` `.pad-big-tablet` `.pad-big-desktop`       | Give the element padding the size of the `--big` variable, typically 24px. |
| `.pad-huge`                            | `.pad-huge-mobile` `.pad-huge-tablet` `.pad-huge-desktop`    | Give the element padding the size of the `--huge` variable, typically 48px. |
|                                        |                                                              |                                                              |
| `.pad-h-micro`                         | `.pad-h-micro-mobile` `.pad-h-micro-tablet` `.pad-h-micro-desktop` | Give the element horizontal padding the size of the `--micro` variable, typically 2px. |
| `.pad-h-tiny`                          | `.pad-h-tiny-mobile` `.pad-h-tiny-tablet` `.pad-h-tiny-desktop` | Give the element horizontal padding the size of the `--tiny` variable, typically 4px. |
| `.pad-h-small`                         | `.pad-h-small-mobile` `.pad-h-small-tablet` `.pad-h-small-desktop` | Give the element horizontal padding the size of the `--small` variable, typically 8px. |
| `.pad-h`                               | `.pad-h-mobile` `.pad-h-tablet` `.pad-h-desktop`             | Give the element horizontal padding the size of the `--normal` variable, typically 16px. |
| `.pad-h-big`                           | `.pad-h-big-mobile` `.pad-h-big-tablet` `.pad-h-big-desktop` | Give the element horizontal padding the size of the `--big` variable, typically 24px. |
| `.pad-h-huge`                          | `.pad-h-huge-mobile` `.pad-h-huge-tablet` `.pad-h-huge-desktop` | Give the element horizontal padding the size of the `--huge` variable, typically 48px. |
|                                        |                                                              |                                                              |
| `.pad-v-micro`                         | `.pad-v-micro-mobile` `.pad-v-micro-tablet` `.pad-v-micro-desktop` | Give the element vertical padding the size of the `--micro` variable, typically 2px. |
| `.pad-v-tiny`                          | `.pad-v-tiny-mobile` `.pad-v-tiny-tablet` `.pad-v-tiny-desktop` | Give the element vertical padding the size of the `--tiny` variable, typically 4px. |
| `.pad-v-small`                         | `.pad-v-small-mobile` `.pad-v-small-tablet` `.pad-v-small-desktop` | Give the element vertical padding the size of the `--small` variable, typically 8px. |
| `.pad-v`                               | `.pad-v-mobile` `.pad-v-tablet` `.pad-v-desktop`             | Give the element vertical padding the size of the `--normal` variable, typically 16px. |
| `.pad-v-big`                           | `.pad-v-big-mobile` `.pad-v-big-tablet` `.pad-v-big-desktop` | Give the element vertical padding the size of the `--big` variable, typically 24px. |
| `.pad-v-huge`                          | `.pad-v-huge-mobile` `.pad-v-huge-tablet` `.pad-v-huge-desktop` | Give the element vertical padding the size of the `--huge` variable, typically 48px. |

```html
<style>
    .row { background: var(--shade1) }
    .box { 
        min-width: 12px; min-height: 12px; 
        border: 1px solid black; 
        background: var(--shade4) 
    }
</style>
<table class="data-table" style="width: 100%">
    <tr>
        <td style="width: 100px">pad-tiny</td>
        <td class="row pad-tiny">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-small</td>
        <td class="row pad-small">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad</td>
        <td class="row pad">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-big</td>
        <td class="row pad-big">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-huge</td>
        <td class="row pad-huge">
            <div class="box"></div>
    	</td>
    </tr>
</table>

<h4>Horizontal Padding</h4>

<table class="data-table" style="width: 100%">
    <tr>
        <td style="width: 100px">pad-h-tiny</td>
        <td class="row pad-h-tiny">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-h-small</td>
        <td class="row pad-h-small">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-h</td>
        <td class="row pad-h">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-h-big</td>
        <td class="row pad-h-big">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-h-huge</td>
        <td class="row pad-h-huge">
            <div class="box"></div>
    	</td>
    </tr>
</table>

<h4>Vertical Padding</h4>

<table class="data-table" style="width: 100%">
    <tr>
        <td style="width: 100px">pad-v-tiny</td>
        <td class="row pad-v-tiny">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-v-small</td>
        <td class="row pad-v-small">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-v</td>
        <td class="row pad-v">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-v-big</td>
        <td class="row pad-v-big">
            <div class="box"></div>
    	</td>
    </tr>
    <tr>
        <td>pad-v-huge</td>
        <td class="row pad-v-huge">
            <div class="box"></div>
    	</td>
    </tr>
</table>
```

### Widths

Eternium.css provides various classes to quickly set the widths of elements.

Percent widths:

| Class    | Responsive Overrides                             | Description              |
| -------- | ------------------------------------------------ | ------------------------ |
| `.pc10`  | `.pc10-mobile` `.pc10-tablet` `.pc10-desktop`    | Width is set to 10%.     |
| `.pc20`  | `.pc20-mobile` `.pc20-tablet` `.pc20-desktop`    | Width is set to 20%.     |
| `.pc25`  | `.pc25-mobile` `.pc25-tablet` `.pc25-desktop`    | Width is set to 25%.     |
| `.pc30`  | `.pc30-mobile` `.pc30-tablet` `.pc30-desktop`    | Width is set to 30%.     |
| `.pc33`  | `.pc33-mobile` `.pc33-tablet` `.pc33-desktop`    | Width is set to 33.333%. |
| `.pc40`  | `.pc40-mobile` `.pc40-tablet` `.pc40-desktop`    | Width is set to 40%.     |
| `.pc50`  | `.pc50-mobile` `.pc50-tablet` `.pc50-desktop`    | Width is set to 50%.     |
| `.pc60`  | `.pc60-mobile` `.pc60-tablet` `.pc60-desktop`    | Width is set to 60%.     |
| `.pc66`  | `.pc66-mobile` `.pc66-tablet` `.pc66-desktop`    | Width is set to 66.666%. |
| `.pc70`  | `.pc70-mobile` `.pc70-tablet` `.pc70-desktop`    | Width is set to 70%.     |
| `.pc75`  | `.pc75-mobile` `.pc75-tablet` `.pc75-desktop`    | Width is set to 75%.     |
| `.pc80`  | `.pc80-mobile` `.pc80-tablet` `.pc80-desktop`    | Width is set to 80%.     |
| `.pc90`  | `.pc90-mobile` `.pc90-tablet` `.pc90-desktop`    | Width is set to 90%.     |
| `.pc100` | `.pc100-mobile` `.pc100-tablet` `.pc100-desktop` | Width is set to 100%.    |

Pixel widths:

| Class     | Responsive Overrides                                | Description                                |
| --------- | --------------------------------------------------- | ------------------------------------------ |
| `.px10`   | `.px10-mobile` `.px10-tablet` `.px10-desktop`       | Min-width and max-width are set to 10px.   |
| `.px20`   | `.px20-mobile` `.px20-tablet` `.px20-desktop`       | Min-width and max-width are set to 20px.   |
| `.px30`   | `.px30-mobile` `.px30-tablet` `.px30-desktop`       | Min-width and max-width are set to 30px.   |
| `.px40`   | `.px40-mobile` `.px40-tablet` `.px40-desktop`       | Min-width and max-width are set to 40px.   |
| `.px50`   | `.px50-mobile` `.px50-tablet` `.px50-desktop`       | Min-width and max-width are set to 50px.   |
| `.px60`   | `.px60-mobile` `.px60-tablet` `.px60-desktop`       | Min-width and max-width are set to 60px.   |
| `.px70`   | `.px70-mobile` `.px70-tablet` `.px70-desktop`       | Min-width and max-width are set to 70px.   |
| `.px80`   | `.px80-mobile` `.px80-tablet` `.px80-desktop`       | Min-width and max-width are set to 80px.   |
| `.px90`   | `.px90-mobile` `.px90-tablet` `.px90-desktop`       | Min-width and max-width are set to 90px.   |
| `.px100`  | `.px100-mobile` `.px100-tablet` `.px100-desktop`    | Min-width and max-width are set to 100px.  |
| `.px120`  | `.px120-mobile` `.px120-tablet` `.px120-desktop`    | Min-width and max-width are set to 120px.  |
| `.px150`  | `.px150-mobile` `.px150-tablet` `.px150-desktop`    | Min-width and max-width are set to 150px.  |
| `.px200`  | `.px200-mobile` `.px200-tablet` `.px200-desktop`    | Min-width and max-width are set to 200px.  |
| `.px250`  | `.px250-mobile` `.px250-tablet` `.px250-desktop`    | Min-width and max-width are set to 250px.  |
| `.px300`  | `.px300-mobile` `.px300-tablet` `.px300-desktop`    | Min-width and max-width are set to 300px.  |
| `.px350`  | `.px350-mobile` `.px350-tablet` `.px350-desktop`    | Min-width and max-width are set to 350px.  |
| `.px400`  | `.px400-mobile` `.px400-tablet` `.px400-desktop`    | Min-width and max-width are set to 400px.  |
| `.px450`  | `.px450-mobile` `.px450-tablet` `.px450-desktop`    | Min-width and max-width are set to 450px.  |
| `.px500`  | `.px500-mobile` `.px500-tablet` `.px500-desktop`    | Min-width and max-width are set to 500px.  |
| `.px550`  | `.px550-mobile` `.px550-tablet` `.px550-desktop`    | Min-width and max-width are set to 550px.  |
| `.px600`  | `.px600-mobile` `.px600-tablet` `.px600-desktop`    | Min-width and max-width are set to 600px.  |
| `.px650`  | `.px650-mobile` `.px650-tablet` `.px650-desktop`    | Min-width and max-width are set to 650px.  |
| `.px700`  | `.px700-mobile` `.px700-tablet` `.px700-desktop`    | Min-width and max-width are set to 700px.  |
| `.px750`  | `.px750-mobile` `.px750-tablet` `.px750-desktop`    | Min-width and max-width are set to 750px.  |
| `.px800`  | `.px800-mobile` `.px800-tablet` `.px800-desktop`    | Min-width and max-width are set to 800px.  |
| `.px850`  | `.px850-mobile` `.px850-tablet` `.px850-desktop`    | Min-width and max-width are set to 850px.  |
| `.px900`  | `.px900-mobile` `.px900-tablet` `.px900-desktop`    | Min-width and max-width are set to 900px.  |
| `.px950`  | `.px950-mobile` `.px950-tablet` `.px950-desktop`    | Min-width and max-width are set to 950px.  |
| `.px1000` | `.px1000-mobile` `.px1000-tablet` `.px1000-desktop` | Min-width and max-width are set to 1000px. |

Flex sizes.  In CSS, the flex value sets how much space an item should take up relative to other items in a container.  For example, If a row has one child with `.flex1` and another child with `.flex3` then the first will take up 25% of the width, and the second 75%.  If a row has one child with `.flex1` and another child with `.flex9` then the first will take up 10% and the second 90%.

| Class     | Responsive Overrides                                | Description        |
| --------- | --------------------------------------------------- | ------------------ |
| `.flex1`  | `.flex1-mobile` `.flex1-tablet` `.flex1-desktop`    | Flex is set to 1.  |
| `.flex2`  | `.flex2-mobile` `.flex2-tablet` `.flex2-desktop`    | Flex is set to 2.  |
| `.flex3`  | `.flex3-mobile` `.flex3-tablet` `.flex3-desktop`    | Flex is set to 3.  |
| `.flex4`  | `.flex4-mobile` `.flex4-tablet` `.flex4-desktop`    | Flex is set to 4.  |
| `.flex5`  | `.flex5-mobile` `.flex5-tablet` `.flex5-desktop`    | Flex is set to 5.  |
| `.flex6`  | `.flex6-mobile` `.flex6-tablet` `.flex6-desktop`    | Flex is set to 6.  |
| `.flex7`  | `.flex7-mobile` `.flex7-tablet` `.flex7-desktop`    | Flex is set to 7.  |
| `.flex8`  | `.flex8-mobile` `.flex8-tablet` `.flex8-desktop`    | Flex is set to 8.  |
| `.flex9`  | `.flex9-mobile` `.flex9-tablet` `.flex9-desktop`    | Flex is set to 9.  |
| `.flex10` | `.flex10-mobile` `.flex10-tablet` `.flex10-desktop` | Flex is set to 10. |
| `.flex11` | `.flex11-mobile` `.flex11-tablet` `.flex11-desktop` | Flex is set to 11. |
| `.flex12` | `.flex12-mobile` `.flex12-tablet` `.flex12-desktop` | Flex is set to 12. |

This example shows how to use the various width classes.

```html
<style>
    div { height: 20px; background: var(--shade4) }
</style>
<main class="row gap-small wrap">
    <div class="px50">px50</div>
    <div class="px100">px100</div>
</main>
<br>
<main class="row gap-small">
    <div class="pc20">pc20</div>
    <div class="pc30">pc30</div>
    <div class="pc50">pc50</div>
</main>
<br>
<main class="row gap-small">
    <div class="flex1">flex1</div>
    <div class="flex2">flex2</div>
    <div class="flex3">flex3</div>
</main>
```

## Styles

To use the classes in this Styles secion, `.eternium` or `.eternium-style` must be present on an ancestral element.  Unlike the layout classes, Eternium style classes do not have responsive variants.

### Inputs and Buttons

Form elements inside the `.eternium` or `.eternium-style` classes are given a default style.

```html
<div class="row gap-small wrap">
    <input placeholder="Input" style="width: 80px">
    <input type="checkbox" class="normal" checked>
    <select>
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea rows="1" style="width: 80px">Text Area</textarea>
    <button>Button</button>
    <button class="primary">Primary</button>
</div>
```

This style can be modified with various classes:

| <div class="px120-desktop">Class</div> |                                                              |
| -------------------------------------- | ------------------------------------------------------------ |
| `.input`                               | Give an element the appearance of an input box.  For example:  `<div contenteditable class="input"></div>` |
| `.button`                              | Give an element the appearance of a button.  Can be used with `<a class="button"></a>` for example. |
| `.flat`                                | Remove the border. background color, and padding from a form field or button. |
| `.square`                              | Give a form field or button sharp corners.                   |
| `.no-outline`                          | The form field or button will have no outline when focused.  |
|                                        |                                                              |
| `.hover`                               | Give a button or form element the appearance of being hovered. |
| `.selected`                            | Give a button or form element the appearance of being selected. |
| `.focus`                               | Give a button or form element the appearance of being focused |
| `.invalid`                             | Mark a form input as invalid.                                |
|                                        |                                                              |
| `.primary`                             | Give a button a bright background (typically blue) to make it look important. |
| `.loading`                             | Give a form field or button an animated loading spinner.     |
| `.error`                               | Give a form field input or button an error icon.             |
| `.success`                             | Give a form field input or button a success icon.            |
|                                        |                                                              |
| `.small`                               | Make a form field or button the height defined in the `--input-small` variable, typically 18px including the border. |
| `.normal`                              | Make the input field a normal size, also defined in the `--input-normal` variable, which is typically 24px.  Typically used only on checkboxes, which default to a small size. |
| `.big`                                 | Make a form field or button the height defined in the `--input-big` variable, typically 32px including the border. |
| `.huge`                                | Make a form field or button the height defined in the `--input-huge` variable, typically 44px including the border. |

This example demonstrates the use of these classes:

```html
<style>
    textarea, input:not([type=checkbox]) { width: 70px }
</style>
<h4>Group</h4>
<div class="row group wrap">
    <input placeholder="Input">
    <input type="checkbox" class="normal" checked>
    <select>
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea rows="1">Textarea</textarea>
    <button>Button</button>
</div>

<h4>Flat</h4>
<div class="row gap-small wrap">
    <input placeholder="Input" class="flat">
    <input type="checkbox" class="normal flat" checked>
    <select class="flat">
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea rows="1" class="flat">Textarea</textarea>
    <button class="flat">Button</button>
</div>

<h4>Within</h4>
<div class="row gap-small wrap input">
   <input placeholder="Input" class="flat">
    <input type="checkbox" class="normal flat" checked>
    <select class="flat">
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea class="flat" rows="1">Textarea</textarea>
    <button class="flat">Button</button>
</div>

<h4>Small</h4>
<div class="row gap-small wrap">
    <input placeholder="Input" class="small">
    <input type="checkbox" class="small" checked>
    <select class="small">
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea class="small" rows="1">Textarea</textarea>
    <button class="small">Button</button>
</div>

<h4>Big</h4>
<div class="row gap-small wrap">
    <input placeholder="Input" class="big">
    <input type="checkbox" class="big" checked>
    <select class="big">
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea class="big" rows="1">Textarea</textarea>
    <button class="big">Button</button>
</div>

<h4>Huge</h4>
<div class="row gap-small wrap">
    <input placeholder="Input" class="huge">
    <input type="checkbox" class="huge" checked>
    <select class="huge">
        <option>Select</option>
        <option>One</option>
        <option>Two</option>
    </select>
    <textarea class="huge" style="width: 80px" rows="1">Textarea</textarea>
    <button class="huge">Button</button>
</div>

<h4>Button Status</h4>
<div class="row gap-small wrap">
    <button class="loading">Loading</button>
    <button class="primary loading">Loading</button>
    <button class="primary big loading">Loading</button>
    <button class="primary huge loading">Loading</button>

    <button class="success">Success</button>
    <button class="primary success">Success</button>

    <button class="error">Error</button>
    <button class="primary error">Error</button>
</div>
```

### Alerts

Styles typically used for alert boxes.

```html
<div class="col gap">
    <div class="info-alert">Info Alert</div>
    <div class="success-alert">Success Alert</div>
    <div class="warning-alert">Warning Alert</div>
    <div class="error-alert">Error Alert</div>
</div>
```

### Visibility

These classes can be used to only show an element on a specific device.  If an element has more than one, it will be visible on both devices.  For example, an element with `.mobile` and `.desktop` classes will be visible everywhere except on tablets.

| Class      |                                         |
| ---------- | --------------------------------------- |
| `.mobile`  | Show element only on mobile.            |
| `.tablet`  | Show element only on tablets.           |
| `.desktop` | Show element only on desktop computers. |

### Tables

Give a table the `data-table` class and it will have a much nicer style than the browser default.

This can also be used with non-table elements.  Such as elements with `.table` `.tr` `.th` `.td` classes.  However, you will have to create CSS rules for these classes so they mimic the layout of a table.

```html
<table class="data-table">
    <thead>
        <tr>
            <th></th>
            <th>Name</th>
            <th>Mass (10<sup>24</sup>kg)</th>
            <th>Diameter (km)</th>
            <th>Density (kg/m<sup>3</sup>)</th>
            <th>Gravity (m/s<sup>2</sup>)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th rowspan="4">Terrestrial<br>planets</th>
            <td>Mercury</td>
            <td>0.330</td>
            <td>4,879</td>
            <td>5427</td>
            <td>3.7</td>
        </tr>
        <tr>
            <td>Venus</td>
            <td>4.87</td>
            <td>12,104</td>
            <td>5243</td>
            <td>8.9</td>
        </tr>
        <tr>
            <td>Earth</td>
            <td>5.97</td>
            <td>12,756</td>
            <td>5514</td>
            <td>9.8</td>
        </tr>
        <tr>
            <td>Mars</td>
            <td>0.642</td>
            <td>6,792</td>
            <td>3933</td>
            <td>3.7</td>
        </tr>
        <tr>
            <th rowspan="4">Jovian<br>planets</th>
            <td>Jupiter</td>
            <td>1898</td>
            <td>142,984</td>
            <td>1326</td>
            <td>23.1</td>
        </tr>
        <tr>
            <td>Saturn</td>
            <td>568</td>
            <td>120,536</td>
            <td>687</td>
            <td>9.0</td>
        </tr>
        <tr>
            <td>Uranus</td>
            <td>86.8</td>
            <td>51,118</td>
            <td>1271</td>
            <td>8.7</td>
        </tr>
        <tr>
            <td>Neptune</td>
            <td>102</td>
            <td>49,528</td>
            <td>1638</td>
            <td>11.0</td>
        </tr>
        <tr>
            <th>Dwarf<br>planets</th>
            <td>Pluto</td>
            <td>0.0146</td>
            <td>2,370</td>
            <td>2095</td>
            <td>0.7</td>
        </tr>
    </tbody>
</table>
```

You can override the table variables inline to get a different style of table:

```html
<table class="data-table" style="color: white;
 --table-header-background: #444; 
 --table-border: 3px solid black; 
 --table-padding: 10px 20px; 
 --table-background: gray
 ">
    <thead>
        <tr>
            <th>One</th>
            <th>Two</th>
        </tr>
    </thead>
    
    <tbody>
        <tr>
            <td>Three</th>
            <td>Four</th>
        </tr>
    </tbody>
</table>
```

### Other Classes

| Class        |                                                              |
| ------------ | ------------------------------------------------------------ |
| `.label`     | Make an element have 85% sized bold text and be unselectable.  Useful for form labels. |
| `.little`    | Make text 80% the normal size, with a smaller 1.1 line-height. |
| `.muted`     | Make text 66% opaque.  Often used together with `.little` for small notes. |
|              |                                                              |
| `.card`      | Give an element a rounded border, solid `--background` colored background, and a small drop shadow. |
| `.no-select` | Make text unselectable via `user-select: none`               |
|              |                                                              |
| `.icon`      | Experimental.                                                |
| `.menu-item` | Experimental.                                                |

### Variables

These variables are set in eternium.css and define the appearance of Eternium Styles.  Most take different values between light and dark modes.  Dark mode can be triggered by adding the `dark` attribute to the root html element.  `<html dark>`.

These variables can be modified in eternium.css or overridden in your own code.

| Variable                       | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `--text`                       | Text color.  Applied to any body tags within the `eternium` or `eternium-style` classes. |
| `--background`                 | Background color.  Applied to any body tags within the `eternium` or `eternium-style` classes. |
| `--invert`                     | Opposite of the background color                             |
| `--shade1`                     | A color slightly off from the background color.              |
| `--shade1`                     | A color a little more off.                                   |
| `--shade3`                     | A little more still.                                         |
| `--shade4`                     | Even more.                                                   |
| `--primary`                    | Color of a primary button.                                   |
| `--primary2`                   | Often used for primary hover states.                         |
| `--primary-text`               |                                                              |
| `--primary-border-focus`       |                                                              |
| `--secondary`                  |                                                              |
| `--secondary-background-hover` |                                                              |
| `--secondary-border-hover`     |                                                              |
| `--input-background`           |                                                              |
| `--input-border`               |                                                              |
| `--card-background`            |                                                              |
| `--card-border`                |                                                              |
| `--border`                     |                                                              |
| `--border-focus`               |                                                              |
| `--table-header-background`    |                                                              |
| `--table-border`               |                                                              |
| `--table-background`           |                                                              |
| `--table-padding`              |                                                              |
|                                |                                                              |
| `--input-small`                | The height of form elements with class `small`               |
| `--input-normal`               |                                                              |
| `--input-big`                  |                                                              |
| `--input-huge`                 |                                                              |
| `--border-width`               |                                                              |
| `--border-radius`              |                                                              |
| `--primary-background`         |                                                              |
| `--primary-border`             |                                                              |
| `--primary-background-hover`   |                                                              |
| `--primary-border-hover`       |                                                              |
| `--secondary-background`       |                                                              |
| `--secondary-border`           |                                                              |

## Examples

### Sticky Footer

A page with a sticky footer, that will be pushed down as the content grows.  Giving the content div a class of `flex1` makes it stretch its height to all available space.

Setting the body height is only necessary for this demo, and doesn't need to be in your code.

```html
<style>body { height: 300px; margin: 0 }</style>

<div class="col stretch-h" style="min-height: 100%">
    <div class="pad center" style="background: var(--shade4)">Header</div>
    <div class="pad flex1" contenteditable>Content:  Edit me to add line returns</div>
    <div class="pad center" style="background: var(--shade3)">Footer</div>
</div>
```



### Aligned form becomes stacked on Mobile

This form moves the labels from the side to above the inputs when the device width is < 512px.  Drag the resizer between the code and the preview to see it adjust as the width decreases.

The `.col-mobile` and `.left-mobile` classes

```html
<div class="card pad col gap-small stretch-h">
	<b>Form adjusts per device</b>
	
	<label class="row center-v stretch-h   col-mobile left-mobile">
		<span class="px70">Username</span>
		<input required class="pc100-mobile"/>
	</label>	
	
	<div class="row center-v stretch-h   col-mobile left-mobile">
		<label class="px70" for="password">Password</label>
		<span class="row group pc100-mobile">
			<input class="flex1" id="password" 
				type="password" required>
			<button>🔍</button>
		</span>
	</div>
	
	<div class="row stretch-h">
		<div class="px70 desktop tablet"><!--spacer--></div>
		<div class="row center-v space-between gap-small wrap">
			<label class="no-select nowrap">
				<input type="checkbox" checked>
				Remember
			</label>
			<div class="row gap-small">
				<button>Cancel</button>
				<button type="submit" class="primary">
					Submit
				</button>
			</div>
		</div>
	</div>
</div>
```

