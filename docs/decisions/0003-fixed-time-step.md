# 0003. Move the game in fixed 1/60 s steps

Status: accepted (Round 1)

In the context of **an animation loop whose frames arrive at different rates on
different screens (30, 60, 144 Hz) and sometimes stall (a hidden tab)**,
facing **the choice between feeding each frame's real elapsed time straight into the
physics (variable step) or always stepping by the same small amount**,
we decided for **a fixed step of 1/60 s: real elapsed time is added to an accumulator
(capped at 0.25 s per frame) and the game steps once for every 1/60 s collected**,
and neglected **a variable step (a jump would be higher or lower depending on the
screen, and one long frame could let the dinosaur skip through a cactus) and a variable
step with a cap (still not identical from screen to screen)**,
to achieve **the same jump height, speed and fairness on every screen, and tests that
repeat exactly (R2.13)**,
accepting **that a 144 Hz screen draws the same state more than once for a step, and
that a hidden tab simply loses time beyond 0.25 s**.
