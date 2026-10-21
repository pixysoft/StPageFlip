import { Orientation, Render } from './Render';
import { PageFlip } from '../PageFlip';
import { FlipDirection } from '../Flip/Flip';
import { PageOrientation } from '../Page/Page';
import { FlipSetting } from '../Settings';

/**
 * Class responsible for rendering the Canvas book
 */
export class CanvasRender extends Render {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;

    constructor(app: PageFlip, setting: FlipSetting, inCanvas: HTMLCanvasElement) {
        super(app, setting);

        this.canvas = inCanvas;
        this.ctx = inCanvas.getContext('2d');
    }

    public getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * 小程序 canvas 自带 requestAnimationFrame；没有再用全局。
     * @param {(timer: number) => void} cb
     * @returns {number}
     */
    protected scheduleFrame(cb: (timer: number) => void): number {
        const host = this.canvas as HTMLCanvasElement & {
            requestAnimationFrame?: (fn: (timer: number) => void) => number;
        };
        if (host && typeof host.requestAnimationFrame === 'function') {
            return host.requestAnimationFrame(cb);
        }
        return super.scheduleFrame(cb);
    }

    /**
     * @param {number} id - scheduleFrame 返回值
     * @returns {void}
     */
    protected cancelFrame(id: number): void {
        const host = this.canvas as HTMLCanvasElement & {
            cancelAnimationFrame?: (handle: number) => void;
        };
        if (host && typeof host.cancelAnimationFrame === 'function') {
            host.cancelAnimationFrame(id);
            return;
        }
        super.cancelFrame(id);
    }

    public reload(): void {
        //
    }

    protected drawFrame(): void {
        this.clear();

        if (this.orientation !== Orientation.PORTRAIT)
            if (this.leftPage != null) this.leftPage.simpleDraw(PageOrientation.LEFT);

        if (this.rightPage != null) this.rightPage.simpleDraw(PageOrientation.RIGHT);

        if (this.bottomPage != null) this.bottomPage.draw();

        this.drawBookShadow();

        if (this.flippingPage != null) this.flippingPage.draw();

        if (this.shadow != null) {
            this.drawOuterShadow();
            this.drawInnerShadow();
        }

        const rect = this.getRect();

        if (this.orientation === Orientation.PORTRAIT) {
            this.ctx.beginPath();
            this.ctx.rect(rect.left + rect.pageWidth, rect.top, rect.width, rect.height);
            this.ctx.clip();
        }
    }

    private drawBookShadow(): void {
        const rect = this.getRect();

        this.ctx.save();
        this.ctx.beginPath();

        const shadowSize = rect.width / 20;
        this.ctx.rect(rect.left, rect.top, rect.width, rect.height);

        const shadowPos = { x: rect.left + rect.width / 2 - shadowSize / 2, y: 0 };
        this.ctx.translate(shadowPos.x, shadowPos.y);

        const outerGradient = this.ctx.createLinearGradient(0, 0, shadowSize, 0);

        outerGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        outerGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.2)');
        outerGradient.addColorStop(0.49, 'rgba(0, 0, 0, 0.1)');
        outerGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
        outerGradient.addColorStop(0.51, 'rgba(0, 0, 0, 0.4)');
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.clip();

        this.ctx.fillStyle = outerGradient;
        this.ctx.fillRect(0, 0, shadowSize, rect.height * 2);

        this.ctx.restore();
    }

    private drawOuterShadow(): void {
        const rect = this.getRect();

        this.ctx.save();
        this.ctx.beginPath();

        this.ctx.rect(rect.left, rect.top, rect.width, rect.height);

        const shadowPos = this.convertToGlobal({ x: this.shadow.pos.x, y: this.shadow.pos.y });
        this.ctx.translate(shadowPos.x, shadowPos.y);

        this.ctx.rotate(Math.PI + this.shadow.angle + Math.PI / 2);

        const outerGradient = this.ctx.createLinearGradient(0, 0, this.shadow.width, 0);

        if (this.shadow.direction === FlipDirection.FORWARD) {
            this.ctx.translate(0, -100);
            outerGradient.addColorStop(0, 'rgba(0, 0, 0, ' + this.shadow.opacity + ')');
            outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
            this.ctx.translate(-this.shadow.width, -100);
            outerGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            outerGradient.addColorStop(1, 'rgba(0, 0, 0, ' + this.shadow.opacity + ')');
        }

        this.ctx.clip();

        this.ctx.fillStyle = outerGradient;
        this.ctx.fillRect(0, 0, this.shadow.width, rect.height * 2);

        this.ctx.restore();
    }

    private drawInnerShadow(): void {
        const rect = this.getRect();

        this.ctx.save();
        this.ctx.beginPath();

        const shadowPos = this.convertToGlobal({ x: this.shadow.pos.x, y: this.shadow.pos.y });

        const pageRect = this.convertRectToGlobal(this.pageRect);
        this.ctx.moveTo(pageRect.topLeft.x, pageRect.topLeft.y);
        this.ctx.lineTo(pageRect.topRight.x, pageRect.topRight.y);
        this.ctx.lineTo(pageRect.bottomRight.x, pageRect.bottomRight.y);
        this.ctx.lineTo(pageRect.bottomLeft.x, pageRect.bottomLeft.y);
        this.ctx.translate(shadowPos.x, shadowPos.y);

        this.ctx.rotate(Math.PI + this.shadow.angle + Math.PI / 2);

        const isw = (this.shadow.width * 3) / 4;
        const innerGradient = this.ctx.createLinearGradient(0, 0, isw, 0);

        if (this.shadow.direction === FlipDirection.FORWARD) {
            this.ctx.translate(-isw, -100);

            // 色标必须严格升序：WebKit 的 CanvasGradient 不排序，降序会交给 CGGradient 产生色阶跳变
            innerGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            innerGradient.addColorStop(0.7, 'rgba(0, 0, 0, ' + this.shadow.opacity + ')');
            innerGradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.05)');
            innerGradient.addColorStop(1, 'rgba(0, 0, 0, ' + this.shadow.opacity + ')');
        } else {
            this.ctx.translate(0, -100);

            innerGradient.addColorStop(0, 'rgba(0, 0, 0, ' + this.shadow.opacity + ')');
            innerGradient.addColorStop(0.1, 'rgba(0, 0, 0, 0.05)');
            innerGradient.addColorStop(0.3, 'rgba(0, 0, 0, ' + this.shadow.opacity + ')');
            innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        this.ctx.clip();

        this.ctx.fillStyle = innerGradient;
        this.ctx.fillRect(0, 0, isw, rect.height * 2);

        this.ctx.restore();
    }

    private clear(): void {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
