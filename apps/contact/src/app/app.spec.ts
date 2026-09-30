import { TestBed } from '@angular/core/testing';
import { Contact } from './remote-entry/contact';

describe('Contact (remote)', () => {
  it('renderiza o título', async () => {
    await TestBed.configureTestingModule({ imports: [Contact] }).compileComponents();
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).toBeTruthy();
  });
});
