import { TestBed } from '@angular/core/testing';
import { About } from './remote-entry/about';

describe('About (remote)', () => {
  it('renderiza o título', async () => {
    await TestBed.configureTestingModule({ imports: [About] }).compileComponents();
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).toBeTruthy();
  });
});
