import {
  Component,
  contentChildren,
  ElementRef,
  inject,
  Injectable,
  OnInit,
  Signal,
  signal,
  TemplateRef,
  viewChild,
  WritableSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';

import { MosSlideDirective } from './slide.directive';

const ITEMS_COUNT = 3;

export class Slide {
  constructor(
    public readonly id: string,
    public readonly template: TemplateRef<unknown>,
  ) {}
}

@Injectable({ providedIn: 'root' })
export class SliderIdService {
  private id: number = 0;

  public getId(): string {
    this.id = ++this.id;

    return `${this.id}`;
  }
}

@Component({
  selector: 'app-slider',
  imports: [NgTemplateOutlet, NgClass],
  templateUrl: './slider.html',
  styleUrl: './slider.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MosSliderComponent implements OnInit {
  private elementRef = inject(ElementRef);
  private idService: SliderIdService = inject(SliderIdService);

  private index = 0;

  private get wrapperElement(): HTMLElement {
    return this.wrapper().nativeElement;
  }

  protected readonly wrapper = viewChild.required('wrapper', { read: ElementRef });
  protected items: Signal<readonly TemplateRef<unknown>[]> = contentChildren(MosSlideDirective, {
    read: TemplateRef,
  });
  protected itemWidth = 0;
  protected slides: WritableSignal<Slide[]> = signal<Slide[]>([]);

  protected animated = false;

  public ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    const { width } = element.getBoundingClientRect();

    this.index = ITEMS_COUNT;
    this.itemWidth = width / ITEMS_COUNT;

    const items = this.items();

    const previousClones = items.slice(-ITEMS_COUNT);
    const nextClones = items.slice(0, ITEMS_COUNT);
    const slides: Slide[] = [...previousClones, ...items, ...nextClones].map(
      (item: TemplateRef<unknown>) => new Slide(this.getId(), item),
    );

    this.slides.set(slides);

    this.transformWrapper();
  }

  public onControlsClick(dir: number): void {
    if (this.animated) {
      return;
    }

    this.animated = true;
    this.index = this.index + dir;

    requestAnimationFrame(() => {
      this.transformWrapper.apply(this);
    });
  }

  public onTransitionEnd(event: TransitionEvent) {
    this.animated = false;

    if (this.index >= this.slides().length - ITEMS_COUNT) {
      this.index = ITEMS_COUNT;

      this.transformWrapper();
    } else if (this.index <= 0) {
      this.index = ITEMS_COUNT;

      this.transformWrapper();
    }
  }

  protected isActive(index: number): boolean {
    const itemsLength = this.items().length;

    if (this.index < ITEMS_COUNT) {
      return itemsLength - ITEMS_COUNT + this.index === index;
    }

    if (this.index >= ITEMS_COUNT + itemsLength) {
      return itemsLength + ITEMS_COUNT - this.index === index;
    }

    return this.index - ITEMS_COUNT === index;
  }

  private getId(): string {
    return this.idService.getId();
  }

  private transformWrapper(): void {
    const transform = this.itemWidth * this.index;

    this.wrapperElement.style.transform = `translateX(-${transform}px)`;
  }
}
