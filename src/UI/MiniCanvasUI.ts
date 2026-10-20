/**
 * 小程序画布壳。不创建 DOM，只提供卷页渲染需要的宽高。
 */

/** 页面已创建的 type=2d canvas 节点 */
export type MiniCanvas = {
    width: number;
    height: number;
    getContext(type: '2d'): CanvasRenderingContext2D;
    /** 小程序用它创建图片；没有则回退 new Image() */
    createImage?: () => HTMLImageElement;
    requestAnimationFrame?: (cb: (timer: number) => void) => number;
    cancelAnimationFrame?: (id: number) => void;
};

type DistSize = {
    offsetWidth: number;
    offsetHeight: number;
};

export class MiniCanvasUI {
    private readonly canvas: MiniCanvas;
    /** Render.getBlockWidth/Height 读这里，不读 DOM */
    private readonly dist: DistSize = { offsetWidth: 0, offsetHeight: 0 };

    /**
     * @param {MiniCanvas} canvas - 外部 canvas
     * @param {number} width - 显示宽
     * @param {number} height - 显示高
     */
    constructor(canvas: MiniCanvas, width: number, height: number) {
        this.canvas = canvas;
        this.resize(width, height);
    }

    /**
     * 同步缓冲尺寸和布局尺寸。
     * @param {number} width
     * @param {number} height
     * @returns {void}
     */
    public resize(width: number, height: number): void {
        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        this.canvas.width = w;
        this.canvas.height = h;
        this.dist.offsetWidth = w;
        this.dist.offsetHeight = h;
    }

    /**
     * @returns {MiniCanvas}
     */
    public getCanvas(): MiniCanvas {
        return this.canvas;
    }

    /**
     * @returns {DistSize} 含 offsetWidth / offsetHeight
     */
    public getDistElement(): DistSize {
        return this.dist;
    }

    /**
     * 尺寸已由 resize 写入，这里不再改 DOM。
     * @returns {void}
     */
    public update(): void {
        return;
    }

    /**
     * 小程序无 CSS 方向类。方向由 Render 自己算。
     * @param {string} _orientation
     * @returns {void}
     */
    public setOrientationStyle(_orientation: string): void {
        return;
    }

    /**
     * 不删除外部 canvas。
     * @returns {void}
     */
    public destroy(): void {
        return;
    }
}
