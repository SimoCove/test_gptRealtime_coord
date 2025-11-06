import { camioFileName } from "../camioFileName";
import {
    imageToBase64,
    base64ToBlob,
    reduceResolution,
    getImgDimensions,
    drawPointedPosition
} from '../utils/utils';

interface UIElements {
    coordContainer: HTMLElement;
    xCoord: HTMLInputElement;
    yCoord: HTMLInputElement;
    imgTemplateContainer: HTMLElement;
}

export class PositionView {
    private static instance: PositionView | null = null;

    private elements: UIElements | null = null;

    private base64Template: string | null = null;

    private constructor() { }

    public static getInstance(): PositionView {
        if (!PositionView.instance) {
            PositionView.instance = new PositionView();
        }

        return PositionView.instance;
    }

    public async init(): Promise<void> {
        this.initializeUIElements();
        if (!this.elements) return console.error("UI elements not initialized");

        this.base64Template = await this.getReducedTemplate();
        this.setInputCoordsMaxLimits(this.base64Template);
        this.updateImageView();

        this.elements.xCoord.oninput = async () => {
            this.enforceInputMinMax(this.elements!.xCoord);
            this.updateImageView();
        };
        this.elements.yCoord.oninput = () => {
            this.enforceInputMinMax(this.elements!.yCoord);
            this.updateImageView();
        };
    }

    private initializeUIElements(): void {
        this.elements = {
            coordContainer: document.getElementById("coordContainer") as HTMLElement,
            xCoord: document.getElementById("xCoord") as HTMLInputElement,
            yCoord: document.getElementById("yCoord") as HTMLInputElement,
            imgTemplateContainer: document.getElementById("imgTemplateContainer") as HTMLElement
        }
    }

    private async getReducedTemplate(): Promise<string> {
        const firstTemplate = await this.getFileTemplate();
        const firstTemplateBlob = base64ToBlob(firstTemplate);
        const reducedDimTemplateBlob = await reduceResolution(firstTemplateBlob);
        return await imageToBase64(reducedDimTemplateBlob);
    }

    private async getFileTemplate(): Promise<string> {
        const path = "/" + camioFileName + "/template.png";
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Cannot fetch ${path}`);
        const blob = await response.blob();
        return await imageToBase64(blob);
    }

    private async setInputCoordsMaxLimits(base64Img: string): Promise<void> {
        if (!this.elements) return console.error("UI elements not initialized");

        const { x, y } = await getImgDimensions(base64Img);
        this.elements.xCoord.max = x.toString();
        this.elements.yCoord.max = y.toString();
    }

    private async updateImageView(): Promise<void> {
        if (!this.elements) return console.error("UI elements not initialized");
        if (!this.base64Template) return;

        const x = Number.isNaN(this.elements.xCoord.valueAsNumber) ? null : this.elements.xCoord.valueAsNumber;
        const y = Number.isNaN(this.elements.yCoord.valueAsNumber) ? null : this.elements.yCoord.valueAsNumber;

        const newImageView = await drawPointedPosition(this.base64Template, x, y);
        this.showImage(newImageView);
    }

    private showImage(base64Img: string): void {
        if (!this.elements) return console.error("UI elements not initialized");

        this.elements.imgTemplateContainer.innerHTML = "";

        const img = document.createElement("img");
        img.src = base64Img;
        img.classList.add("imgTemplate");
        this.elements.imgTemplateContainer.appendChild(img);
    }

    private enforceInputMinMax(input: HTMLInputElement): void {
        const max = parseInt(input.max);
        const min = parseInt(input.min);
        let value = input.valueAsNumber;

        if (isNaN(value)) return;

        if (value > max) value = max;
        if (value < min) value = min;

        input.valueAsNumber = value;
    }

    public getPointedCoords(): { x: number | null, y: number | null } {
        if (!this.elements) throw new Error("UI elements not initialized");
        if (!this.base64Template) throw new Error("Image template missing");

        const x = Number.isNaN(this.elements.xCoord.valueAsNumber) ? null : this.elements.xCoord.valueAsNumber;
        const y = Number.isNaN(this.elements.yCoord.valueAsNumber) ? null : this.elements.yCoord.valueAsNumber;

        return { x, y };
    }
}