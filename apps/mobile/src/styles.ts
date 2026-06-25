// Public styles entry point. The stylesheet is split into cohesive area
// modules under `./styles/` and merged here into a single `styles` object, so
// every existing `styles.X` reference keeps working unchanged. `colors` is the
// shared palette, re-exported for convenience.
import { colors } from "./styles/colors";
import { baseStyles } from "./styles/base";
import { authStyles } from "./styles/auth";
import { shellStyles } from "./styles/shell";
import { membersStyles } from "./styles/members";
import { inviteStyles } from "./styles/invite";
import { economyStyles } from "./styles/economy";
import { activityStyles } from "./styles/activity";
import { setupStyles } from "./styles/setup";

export { colors };

export const styles = {
  ...baseStyles,
  ...authStyles,
  ...shellStyles,
  ...membersStyles,
  ...inviteStyles,
  ...economyStyles,
  ...activityStyles,
  ...setupStyles,
};
