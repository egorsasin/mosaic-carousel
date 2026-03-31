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
  DestroyRef,
  computed,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { auditTime, distinctUntilChanged, filter, map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  host: {
    '[class.mos-slider]': 'containerWidth() > 0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MosSliderComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
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
  protected itemWidth: Signal<number> = computed(() => {
    const itemsCount = this.itemsCount();

    return itemsCount ? this.containerWidth() / itemsCount : this.containerWidth();
  });
  protected slides: WritableSignal<Slide[]> = signal<Slide[]>([]);
  protected itemsCount = signal<number>(0);
  protected containerWidth = signal<number>(0);
  protected animated = false;

  public ngOnInit(): void {
    this.slides.set(
      this.items().map((item: TemplateRef<unknown>) => new Slide(this.getId(), item)),
    );

    const resize = new Observable<ResizeObserverEntry[]>((subscriber) => {
      const nativeElement = this.elementRef.nativeElement;
      const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        subscriber.next(entries);
      });

      observer.observe(nativeElement);

      return () => {
        observer.unobserve(nativeElement);
        subscriber.complete();
      };
    });

    const containerWidth = resize.pipe(
      filter((entries: ResizeObserverEntry[]) => !!entries.length),
      auditTime(50),
      map((entries: ResizeObserverEntry[]) => {
        const entry = entries[0];

        return entry.contentRect.width;
      }),
    );

    containerWidth.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((width: number) => {
      this.containerWidth.set(width);

      this.transformWrapper();
    });

    containerWidth
      .pipe(
        map((width: number) => (width <= 400 ? 1 : 3)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((itemsCount: number) => {
        this.renderSlides(itemsCount);
      });
  }

  private renderSlides(itemsCount: number): void {
    const currentItemsCount = this.itemsCount();
    const indexDiff = itemsCount - currentItemsCount;
    const items = this.items();

    let slides: Slide[] = this.slides();

    if (indexDiff > 0) {
      if (slides.length < items.length + itemsCount * 2) {
        this.index = this.getTrueIndex() + itemsCount;

        const previousClones = items
          .slice(items.length - itemsCount, items.length - currentItemsCount)
          .map((item: TemplateRef<unknown>) => new Slide(this.getId(), item));

        console.log('___NEXT CLONES___', currentItemsCount, itemsCount);

        const nextClones = items
          .slice(currentItemsCount, itemsCount)
          .map((item: TemplateRef<unknown>) => new Slide(this.getId(), item));
        slides = [...previousClones, ...slides, ...nextClones];

        this.slides.set(slides);
      }
    }

    this.itemsCount.set(itemsCount);
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

    const itemsCount = this.itemsCount();

    if (this.index >= this.slides().length - itemsCount) {
      this.index = this.getTrueIndex(true);

      this.transformWrapper();
    } else if (this.index <= 0) {
      this.index = this.items().length;
      this.transformWrapper();
    }
  }

  protected isActive(index: number): boolean {
    return this.getTrueIndex() === index;
  }

  protected getTrueIndex(withOffset = false): number {
    const itemsLength = this.items().length;
    const offset: number = (this.slides().length - itemsLength) / 2;

    let offsetIndex = this.index;

    if (this.index < offset) {
      offsetIndex = itemsLength + this.index;
    }

    if (this.index >= itemsLength + offset) {
      offsetIndex = this.index - itemsLength;
    }

    return offsetIndex - (withOffset ? 0 : offset);
  }

  private getId(): string {
    return this.idService.getId();
  }

  private transformWrapper(): void {
    const transform = this.itemWidth() * this.index;

    this.wrapperElement.style.transform = `translateX(-${transform}px)`;
  }
}
