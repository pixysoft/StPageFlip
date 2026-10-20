import { CanvasRender } from '../Render/CanvasRender';
import { Page, PageDensity, PageOrientation } from './Page';
import { Render } from '../Render/Render';
import { Point } from '../BasicTypes';

/**
 * Class representing a book page as an image on Canvas
 */
export class ImagePage extends Page {
    private readonly image: HTMLImageElement = null;
    private readonly href: string;
    private isLoad = false;

    private loadingAngle = 0;

    /**
     * @param {Render} render
     * @param {string} href - 图片地址
     * @param {PageDensity} density
     * @param {() => HTMLImageElement} [createImage] - 小程序传入 canvas.createImage
     */
    constructor(
        render: Render,
        href: string,
        density: PageDensity,
        createImage?: () => HTMLImageElement
    ) {
        super(render, density);

        this.href = href;
        this.image = createImage ? createImage() : new Image();
    }

    public draw(tempDensity?: PageDensity): void {
        const ctx = (this.render as CanvasRender).getContext();

        const pagePos = this.render.convertToGlobal(this.state.position);
        const pageWidth = this.render.getRect().pageWidth;
        const pageHeight = this.render.getRect().height;

        ctx.save();
        ctx.translate(pagePos.x, pagePos.y);
        ctx.beginPath();

        for (let p of this.state.area) {
            if (p !== null) {
                p = this.render.convertToGlobal(p);
                ctx.lineTo(p.x - pagePos.x, p.y - pagePos.y);
            }
        }

        ctx.rotate(this.state.angle);

        ctx.clip();

        if (!this.isReady()) {
            this.drawLoader(ctx, { x: 0, y: 0 }, pageWidth, pageHeight);
        } else {
            ctx.drawImage(this.image, 0, 0, pageWidth, pageHeight);
        }

        ctx.restore();
    }

    public simpleDraw(orient: PageOrientation): void {
        const rect = this.render.getRect();
        const ctx = (this.render as CanvasRender).getContext();

        const pageWidth = rect.pageWidth;
        const pageHeight = rect.height;

        const x = orient === PageOrientation.RIGHT ? rect.left + rect.pageWidth : rect.left;

        const y = rect.top;

        if (!this.isReady()) {
            this.drawLoader(ctx, { x, y }, pageWidth, pageHeight);
        } else {
            ctx.drawImage(this.image, x, y, pageWidth, pageHeight);
        }
    }

    /**
     * 图片是否已真正可绘制。小程序里对未加载完或 0 尺寸图片 drawImage 会抛错
     * @returns {boolean}
     */
    private isReady(): boolean {
        return (
            this.isLoad &&
            this.image !== null &&
            this.image.width > 0 &&
            this.image.height > 0
        );
    }

    private drawLoader(
        ctx: CanvasRenderingContext2D,
        shiftPos: Point,
        pageWidth: number,
        pageHeight: number
    ): void {
        ctx.beginPath();
        const setting = this.render.getSettings();
        ctx.strokeStyle = setting.loaderBorderColor;
        ctx.fillStyle = setting.loaderColor;
        ctx.lineWidth = 1;
        ctx.rect(shiftPos.x + 1, shiftPos.y + 1, pageWidth - 1, pageHeight - 1);
        ctx.stroke();
        ctx.fill();

        const middlePoint: Point = {
            x: shiftPos.x + pageWidth / 2,
            y: shiftPos.y + pageHeight / 2,
        };

        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.arc(
            middlePoint.x,
            middlePoint.y,
            20,
            this.loadingAngle,
            (3 * Math.PI) / 2 + this.loadingAngle
        );
        ctx.stroke();
        ctx.closePath();

        this.loadingAngle += 0.07;
        if (this.loadingAngle >= 2 * Math.PI) {
            this.loadingAngle = 0;
        }
    }

    public load(): void {
        if (this.isLoad) return;
        // 空地址设 src 不会触发 onload，只会永远停在 loader
        if (!this.href) {
            console.warn('[page-flip] empty image href, keep loader');
            return;
        }
        // 先挂 onload 再设 src，避免缓存图在赋值前就加载完
        this.image.onload = (): void => {
            this.isLoad = true;
        };
        this.image.onerror = (): void => {
            console.warn('[page-flip] image load failed', this.href);
        };
        this.image.src = this.href;
    }

    public newTemporaryCopy(): Page {
        return this;
    }

    public getTemporaryCopy(): Page {
        return this;
    }

    public hideTemporaryCopy(): void {
        return;
    }
}
