import { PageCollection } from './Collection/PageCollection';
import { ImagePageCollection } from './Collection/ImagePageCollection';
import { HTMLPageCollection } from './Collection/HTMLPageCollection';
import { PageRect, Point } from './BasicTypes';
import { Flip, FlipCorner, FlippingState } from './Flip/Flip';
import { Orientation, Render } from './Render/Render';
import { CanvasRender } from './Render/CanvasRender';
import { HTMLUI } from './UI/HTMLUI';
import { CanvasUI } from './UI/CanvasUI';
import { Helper } from './Helper';
import { Page } from './Page/Page';
import { EventObject } from './Event/EventObject';
import { HTMLRender } from './Render/HTMLRender';
import { FlipSetting, Settings } from './Settings';
import { UI } from './UI/UI';
import { MiniCanvasUI, MiniCanvas } from './UI/MiniCanvasUI';

/**
 * Class representing a main PageFlip object
 *
 * @extends EventObject
 */
export class PageFlip extends EventObject {
    private mousePosition: Point;
    private isUserTouch = false;
    private isUserMove = false;

    private readonly setting: FlipSetting = null;
    /** 浏览器根节点。小程序模式为 null，不创建、不删除 DOM */
    private readonly block: HTMLElement | null;
    /** 小程序用 canvas.createImage；浏览器为 null，仍 new Image() */
    private imageFactory: (() => HTMLImageElement) | null = null;

    private pages: PageCollection = null;
    private flipController: Flip;
    private render: Render;

    private ui: UI | MiniCanvasUI;

    /**
     * Create a new PageFlip instance
     *
     * @constructor
     * @param {HTMLElement | null} inBlock - 浏览器根节点；小程序传 null
     * @param {Object} setting - Configuration object
     */
    constructor(inBlock: HTMLElement | null, setting: Partial<FlipSetting>) {
        super();

        this.setting = new Settings().getSettings(setting);
        this.block = inBlock;
    }

    /**
     * Destructor. Remove a root HTML element and all event handlers
     */
    public destroy(): void {
        if (this.render) this.render.stop();
        if (this.ui) this.ui.destroy();
        // 只删除库自己挂上的浏览器根节点；外部传入的小程序 canvas 不 remove
        if (this.block) this.block.remove();
    }

    /**
     * Update the render area. Re-show current page.
     */
    public update(): void {
        this.render.update();
        this.pages.show();
    }

    /**
     * Load pages from images on the Canvas mode
     *
     * @param {string[]} imagesHref - List of paths to images
     */
    /**
     * 小程序：使用页面已有的 2d canvas 加载图片页，不创建 DOM。
     * @param {MiniCanvas} canvas - type=2d 节点
     * @param {number} width - 显示宽度（像素），同时作为缓冲宽度
     * @param {number} height - 显示高度（像素）
     * @param {string[]} imagesHref - 页图地址，顺序即页序
     * @returns {void}
     */
    public loadFromMiniCanvas(
        canvas: MiniCanvas,
        width: number,
        height: number,
        imagesHref: string[]
    ): void {
        this.imageFactory = (): HTMLImageElement => {
            if (typeof canvas.createImage === 'function') return canvas.createImage();
            return new Image();
        };
        this.ui = new MiniCanvasUI(canvas, width, height);

        const view = (this.ui as MiniCanvasUI).getCanvas();
        this.render = new CanvasRender(this, this.setting, view as HTMLCanvasElement);
        this.flipController = new Flip(this.render, this);
        this.pages = new ImagePageCollection(this, this.render, imagesHref);
        this.pages.load();
        this.render.start();
        this.pages.show(this.setting.startPage);

        setTimeout(() => {
            this.ui.update();
            this.trigger('init', this, {
                page: this.setting.startPage,
                mode: this.render.getOrientation(),
            });
        }, 1);
    }

    public loadFromImages(imagesHref: string[]): void {
        this.ui = new CanvasUI(this.block, this, this.setting);

        const canvas = (this.ui as CanvasUI).getCanvas();
        this.render = new CanvasRender(this, this.setting, canvas);

        this.flipController = new Flip(this.render, this);

        this.pages = new ImagePageCollection(this, this.render, imagesHref);
        this.pages.load();

        this.render.start();

        this.pages.show(this.setting.startPage);

        // safari fix
        setTimeout(() => {
            this.ui.update();
            this.trigger('init', this, {
                page: this.setting.startPage,
                mode: this.render.getOrientation(),
            });
        }, 1);
    }

    /**
     * Load pages from HTML elements on the HTML mode
     *
     * @param {(NodeListOf<HTMLElement>|HTMLElement[])} items - List of pages as HTML Element
     */
    public loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void {
        this.ui = new HTMLUI(this.block, this, this.setting, items);

        this.render = new HTMLRender(this, this.setting, this.ui.getDistElement());

        this.flipController = new Flip(this.render, this);

        this.pages = new HTMLPageCollection(this, this.render, this.ui.getDistElement(), items);
        this.pages.load();

        this.render.start();

        this.pages.show(this.setting.startPage);

        // safari fix
        setTimeout(() => {
            this.ui.update();
            this.trigger('init', this, {
                page: this.setting.startPage,
                mode: this.render.getOrientation(),
            });
        }, 1);
    }

    /**
     * Update current pages from images
     *
     * @param {string[]} imagesHref - List of paths to images
     */
    public updateFromImages(imagesHref: string[]): void {
        const current = this.pages.getCurrentPageIndex();

        this.pages.destroy();
        this.pages = new ImagePageCollection(this, this.render, imagesHref);
        this.pages.load();

        this.pages.show(current);
        this.trigger('update', this, {
            page: current,
            mode: this.render.getOrientation(),
        });
    }

    /**
     * Update current pages from HTML
     *
     * @param {(NodeListOf<HTMLElement>|HTMLElement[])} items - List of pages as HTML Element
     */
    public updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void {
        const current = this.pages.getCurrentPageIndex();

        this.pages.destroy();
        // HTML 模式的 dist 一定是元素；小程序 UI 不会走到这里
        const dist = (this.ui as HTMLUI).getDistElement();
        this.pages = new HTMLPageCollection(this, this.render, dist, items);
        this.pages.load();
        (this.ui as HTMLUI).updateItems(items);
        this.render.reload();

        this.pages.show(current);
        this.trigger('update', this, {
            page: current,
            mode: this.render.getOrientation(),
        });
    }

    /**
     * Clear pages from HTML (remove to initinalState)
     */
    public clear(): void {
        this.pages.destroy();
        (this.ui as HTMLUI).clear();
    }

    /**
     * Turn to the previous page (without animation)
     */
    public turnToPrevPage(): void {
        this.pages.showPrev();
    }

    /**
     * Turn to the next page (without animation)
     */
    public turnToNextPage(): void {
        this.pages.showNext();
    }

    /**
     * Turn to the specified page number (without animation)
     *
     * @param {number} page - New page number
     */
    public turnToPage(page: number): void {
        this.pages.show(page);
    }

    /**
     * Turn to the next page (with animation)
     *
     * @param {FlipCorner} corner - Active page corner when turning
     */
    public flipNext(corner: FlipCorner = FlipCorner.TOP): void {
        this.flipController.flipNext(corner);
    }

    /**
     * Turn to the prev page (with animation)
     *
     * @param {FlipCorner} corner - Active page corner when turning
     */
    public flipPrev(corner: FlipCorner = FlipCorner.TOP): void {
        this.flipController.flipPrev(corner);
    }

    /**
     * Turn to the specified page number (with animation)
     *
     * @param {number} page - New page number
     * @param {FlipCorner} corner - Active page corner when turning
     */
    public flip(page: number, corner: FlipCorner = FlipCorner.TOP): void {
        this.flipController.flipToPage(page, corner);
    }

    /**
     * 立即中止进行中的翻页动画，不翻页。
     * @returns {void}
     */
    public cancelAnimation(): void {
        this.flipController.cancelAnimation();
    }

    /**
     * Call a state change event trigger
     *
     * @param {FlippingState} newState - New  state of the object
     */
    public updateState(newState: FlippingState): void {
        this.trigger('changeState', this, newState);
    }

    /**
     * Call a page number change event trigger
     *
     * @param {number} newPage - New page Number
     */
    public updatePageIndex(newPage: number): void {
        this.trigger('flip', this, newPage);
    }

    /**
     * Call a page orientation change event trigger. Update UI and rendering area
     *
     * @param {Orientation} newOrientation - New page orientation (portrait, landscape)
     */
    public updateOrientation(newOrientation: Orientation): void {
        this.ui.setOrientationStyle(newOrientation);
        this.update();
        this.trigger('changeOrientation', this, newOrientation);
    }

    /**
     * Get the total number of pages in a book
     *
     * @returns {number}
     */
    public getPageCount(): number {
        return this.pages.getPageCount();
    }

    /**
     * Get the index of the current page in the page list (starts at 0)
     *
     * @returns {number}
     */
    public getCurrentPageIndex(): number {
        return this.pages.getCurrentPageIndex();
    }

    /**
     * Get page from collection by number
     *
     * @param {number} pageIndex
     * @returns {Page}
     */
    public getPage(pageIndex: number): Page {
        return this.pages.getPage(pageIndex);
    }

    /**
     * Get the current rendering object
     *
     * @returns {Render}
     */
    public getRender(): Render {
        return this.render;
    }

    /**
     * Get current object responsible for flipping
     *
     * @returns {Flip}
     */
    public getFlipController(): Flip {
        return this.flipController;
    }

    /**
     * Get current page orientation
     *
     * @returns {Orientation} Сurrent orientation: portrait or landscape
     */
    public getOrientation(): Orientation {
        return this.render.getOrientation();
    }

    /**
     * Get current book sizes and position
     *
     * @returns {PageRect}
     */
    public getBoundsRect(): PageRect {
        return this.render.getRect();
    }

    /**
     * Get configuration object
     *
     * @returns {FlipSetting}
     */
    public getSettings(): FlipSetting {
        return this.setting;
    }

    /**
     * Get UI object
     *
     * @returns {UI}
     */
    /**
     * 浏览器返回 DOM UI；小程序返回外部 canvas 的尺寸壳。
     * @returns {UI | MiniCanvasUI}
     */
    public getUI(): UI | MiniCanvasUI {
        return this.ui;
    }

    /**
     * 小程序创图函数；浏览器为 null。
     * @returns {(() => HTMLImageElement) | null}
     */
    public getImageFactory(): (() => HTMLImageElement) | null {
        return this.imageFactory;
    }

    /**
     * Get current flipping state
     *
     * @returns {FlippingState}
     */
    public getState(): FlippingState {
        return this.flipController.getState();
    }

    /**
     * Get page collection
     *
     * @returns {PageCollection}
     */
    public getPageCollection(): PageCollection {
        return this.pages;
    }

    /**
     * Start page turning. Called when a user clicks or touches
     *
     * @param {Point} pos - Touch position in coordinates relative to the book
     */
    public startUserTouch(pos: Point): void {
        this.mousePosition = pos; // Save touch position
        this.isUserTouch = true;
        this.isUserMove = false;
    }

    /**
     * Called when a finger / mouse moves
     *
     * @param {Point} pos - Touch position in coordinates relative to the book
     * @param {boolean} isTouch - True if there was a touch event, not a mouse click
     */
    public userMove(pos: Point, isTouch: boolean): void {
        if (!this.isUserTouch && !isTouch && this.setting.showPageCorners) {
            this.flipController.showCorner(pos); // fold Page Corner
        } else if (this.isUserTouch) {
            if (Helper.GetDistanceBetweenTwoPoint(this.mousePosition, pos) > 5) {
                this.isUserMove = true;
                this.flipController.fold(pos);
            }
        }
    }

    /**
     * Сalled when the user has stopped touching
     *
     * @param {Point} pos - Touch end position in coordinates relative to the book
     * @param {boolean} isSwipe - true if there was a mobile swipe event
     */
    public userStop(pos: Point, isSwipe = false): void {
        if (this.isUserTouch) {
            this.isUserTouch = false;

            if (!isSwipe) {
                if (!this.isUserMove) this.flipController.flip(pos);
                else this.flipController.stopMove();
            }
        }
    }
}
