import React from 'react';
import styles from './ModeSwitcher.module.css';

interface ModeSwitcherProps {
  /** Current state of the toggle (true = Admin/My Tasks, false = App/My Plans) */
  isAdminMode: boolean;
  /** Callback fired when the toggle state changes */
  onChange: (checked: boolean) => void;
  /** Label for the unchecked state (default: "My Plans") */
  leftLabel?: string;
  /** Label for the checked state (default: "My Tasks") */
  rightLabel?: string;
  /** Unique ID for the input elements */
  id?: string;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  isAdminMode,
  onChange,
  leftLabel = "My Plans",
  rightLabel = "My Tasks",
  id = "admin-mode-toggle",
}) => {
  return (
    <div className={styles.modeToggleContainer}>
      <span className={`${styles.modeLabel} ${!isAdminMode ? styles.active : ''}`}>
        {leftLabel}
      </span>
      <div className={styles.toggleBorder}>
        <input
          id={id}
          type="checkbox"
          checked={isAdminMode}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={id}>
          <div className={styles.handle}></div>
        </label>
      </div>
      <span className={`${styles.modeLabel} ${isAdminMode ? styles.active : ''}`}>
        {rightLabel}
      </span>
    </div>
  );
};
