import {
  Component,
  contentChildren,
  ElementRef,
  inject,
  Inject,
  InjectionToken,
  Injectable,
  OnInit,
  Signal,
  signal,
  TemplateRef,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';

import { MosSlideDirective } from './slide.directive';

const ITEMS_COUNT = 3;
const PREFIX_LENGTH = new InjectionToken<number>('PREFIX_LENGTH', {
  providedIn: 'root',
  factory: () => 8,
});

export class Slide {
  constructor(
    public readonly id: string,
    public readonly template: TemplateRef<unknown>,
  ) {}
}

@Injectable({ providedIn: 'root' })
export class SliderIdService {
  private id: number = 0;
  private prefix: string;

  constructor(@Inject(PREFIX_LENGTH) prefixLength: number) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const prefix = [...new Array(prefixLength)].map(() =>
      alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
    );

    this.prefix = prefix.join('');
  }

  public getId(): string {
    this.id = ++this.id;

    return `${this.prefix}-${this.id}`;
  }
}

@Component({
  selector: 'app-slider',
  imports: [NgTemplateOutlet, NgClass],
  templateUrl: './slider.html',
  styleUrl: './slider.css',
})
export class MosSliderComponent implements OnInit {
  private elementRef = inject(ElementRef);
  private idService: SliderIdService = inject(SliderIdService);

  private index = 0;
  private indexCached = 0;

  private get wrapperElement(): HTMLElement {
    return this.wrapper().nativeElement;
  }

  protected readonly wrapper = viewChild.required('wrapper', { read: ElementRef });
  protected items: Signal<readonly TemplateRef<unknown>[]> = contentChildren(MosSlideDirective, {
    read: TemplateRef,
  });
  protected itemWidth = signal<number>(0);
  protected slides: WritableSignal<Slide[]> = signal<Slide[]>([]);

  protected animated = false;

  public ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    const { width } = element.getBoundingClientRect();

    this.index = this.items().length - 1;
    this.indexCached = this.index;

    this.itemWidth.set(width / ITEMS_COUNT);

    const items = this.items();

    const previousClones = items.slice(-ITEMS_COUNT)
    const slides: Slide[] = items
      .slice(-ITEMS_COUNT)
      .map((item: TemplateRef<unknown>) => new Slide(this.getId(), item));

    this.slides.set(slides);
  }

  public onControlsClick(dir: number): void {
    if (this.animated) {
      return;
    }

    const index = this.index;
    const target = this.items();

    const transform = this.itemWidth();
    

    if (dir < 0) {
      this.wrapperElement.style.transform = `translateX(${-transform}px)`;

      this.slides.update((value) => [new Slide(this.getId(), target[index]), ...value]);
      this.animated = true;

      requestAnimationFrame(() => {
        this.wrapperElement.style.transform = `translateX(0)`;
      });
    } else {
      this.animated = true;

      this.slides.update((value) => [
        ...value,
        new Slide(this.getId(), target[index + 1 >= target.length ? 0 : index + 1]),
      ]);

      requestAnimationFrame(() => {
        this.wrapperElement.style.transform = `translateX(${-transform}px)`;
      });
    }

    if (this.index === 0 && dir < 0) {
      this.index = this.items().length - 1;
    } else {
      this.index = this.index + dir > this.items().length - 1 ? 0 : this.index + dir;
    }
  }
  public onTransitionEnd(event: TransitionEvent) {
    this.animated = false;

    if (
      this.index - this.indexCached === 1 ||
      this.indexCached - this.index === this.items().length - 1
    ) {
      const wrapperElement = this.wrapper().nativeElement;

      this.slides.update((value) => value.slice(1));
      wrapperElement.style.transform = `translateX(0)`;
    } else {
      this.slides.update((value) => value.slice(0, ITEMS_COUNT));
    }

    this.indexCached = this.index;
  }

  private getId(): string {
    return this.idService.getId();
  }
}
