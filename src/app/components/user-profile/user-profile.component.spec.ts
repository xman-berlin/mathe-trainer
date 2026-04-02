import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserProfileComponent } from './user-profile.component';
import { AuthService } from '../../services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import { DailyStreakService } from '../../services/daily-streak.service';
import { STREAK_MILESTONES } from '../../models/daily-streak.model';
import type { User } from '../../models/user.model';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'testuser',
    avatar_style: 'adventurer',
    created_at: '2025-01-01T00:00:00Z',
    last_active_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('UserProfileComponent', () => {
  let component: UserProfileComponent;
  let fixture: ComponentFixture<UserProfileComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const currentUserSignal = signal<User | null>(null);

    const mockAuthService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: () => currentUserSignal() !== null,
      logout: jasmine.createSpy('logout').and.resolveTo(),
    };

    const mockAvatarService = jasmine.createSpyObj('AvatarService', ['generateAvatarUrl']);
    mockAvatarService.generateAvatarUrl.and.returnValue('https://example.com/avatar.svg');

    const currentStreakSignal = signal(0);
    const longestStreakSignal = signal(0);
    const achievedMilestonesSignal = signal<number[]>([]);

    const mockStreakService = {
      currentStreak: currentStreakSignal.asReadonly(),
      longestStreak: longestStreakSignal.asReadonly(),
      achievedMilestones: achievedMilestonesSignal.asReadonly(),
      MILESTONES: STREAK_MILESTONES,
      getNextMilestone: jasmine.createSpy('getNextMilestone'),
      getDaysToNextMilestone: jasmine.createSpy('getDaysToNextMilestone'),
      isAtMilestone: jasmine.createSpy('isAtMilestone'),
    };

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AvatarService, useValue: mockAvatarService },
        { provide: DailyStreakService, useValue: mockStreakService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;

    // Set up a logged-in user
    currentUserSignal.set(makeUser());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display username', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('testuser');
  });

  it('should show avatar image', () => {
    const el: HTMLElement = fixture.nativeElement;
    const img = el.querySelector('.user-avatar') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('avatar.svg');
  });

  it('should call logout and navigate on switchUser', async () => {
    await component.switchUser();
    const mockAuthService = TestBed.inject(AuthService) as unknown as { logout: jasmine.Spy };
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
