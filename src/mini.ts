/**
 * 小程序入口。不引用 CSS、不创建 DOM。
 * 页面传入 type=2d canvas，触摸坐标相对该 canvas 左上角。
 */
import { PageFlip } from './PageFlip';
import { MiniCanvas } from './UI/MiniCanvasUI';
import { FlipSetting } from './Settings';
import { FlipCorner } from './Flip/Flip';

export type { MiniCanvas };

/**
 * 小程序书实例。翻页算法与浏览器 Canvas 模式相同。
 */
export type MiniPageFlip = {
    /** 装入页图。再次调用则替换图片并停在当前页 */
    loadImages(imagesHref: string[]): void;
    /** 按下。x/y 相对 canvas 左上角 */
    touchStart(x: number, y: number): void;
    /** 移动 */
    touchMove(x: number, y: number): void;
    /** 松开：未拖动则翻页，拖过则按位置翻完或弹回 */
    touchEnd(x: number, y: number): void;
    /** 窗口变化时更新缓冲尺寸 */
    resize(width: number, height: number): void;
    /** 停渲染。不 remove canvas */
    destroy(): void;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    /** 远处跳页仍只卷相邻的一张，与浏览器 flip 相同 */
    flip(page: number, corner?: FlipCorner): void;
    /** 无动画跳页 */
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    on(eventName: string, callback: (e: { data: unknown; object: PageFlip }) => void): void;
};

/**
 * 用外部 canvas 创建书。
 * @param {MiniCanvas} canvas - 页面 selector 得到的 type=2d 节点
 * @param {number} width - 显示宽度（像素）
 * @param {number} height - 显示高度（像素）
 * @param {Partial<FlipSetting>} [settings] - 与浏览器同一套配置
 * @returns {MiniPageFlip}
 */
export function createMiniPageFlip(
    canvas: MiniCanvas,
    width: number,
    height: number,
    settings: Partial<FlipSetting> = {}
): MiniPageFlip {
    const app = new PageFlip(null, settings);
    let viewW = width;
    let viewH = height;
    let ready = false;

    return {
        loadImages(imagesHref: string[]): void {
            if (!ready) {
                app.loadFromMiniCanvas(canvas, viewW, viewH, imagesHref);
                ready = true;
                return;
            }
            app.updateFromImages(imagesHref);
        },
        touchStart(x: number, y: number): void {
            if (!ready) return;
            app.startUserTouch({ x, y });
        },
        touchMove(x: number, y: number): void {
            if (!ready) return;
            app.userMove({ x, y }, true);
        },
        touchEnd(x: number, y: number): void {
            if (!ready) return;
            app.userStop({ x, y });
        },
        resize(nextWidth: number, nextHeight: number): void {
            viewW = nextWidth;
            viewH = nextHeight;
            if (!ready) return;
            const ui = app.getUI();
            if (ui && typeof (ui as { resize?: (w: number, h: number) => void }).resize === 'function') {
                (ui as { resize: (w: number, h: number) => void }).resize(nextWidth, nextHeight);
            }
            app.update();
        },
        destroy(): void {
            app.destroy();
            ready = false;
        },
        flipNext(corner?: FlipCorner): void {
            if (ready) app.flipNext(corner);
        },
        flipPrev(corner?: FlipCorner): void {
            if (ready) app.flipPrev(corner);
        },
        flip(page: number, corner?: FlipCorner): void {
            if (ready) app.flip(page, corner);
        },
        turnToPage(page: number): void {
            if (ready) app.turnToPage(page);
        },
        getCurrentPageIndex(): number {
            return ready ? app.getCurrentPageIndex() : 0;
        },
        getPageCount(): number {
            return ready ? app.getPageCount() : 0;
        },
        on(eventName: string, callback: (e: { data: unknown; object: PageFlip }) => void): void {
            app.on(eventName, callback as (e: { data: number | string | boolean | object; object: PageFlip }) => void);
        },
    };
}
