# Running our crowd experiment

The codebase for this crowd experiment is based on the `amt-shim-template`. To deploy this, host the `/code` directory on a static hosting servce, and access `annotate.html`

For more details, you should check out `jmchn1994/amt-shim-template`.

## Lite Intro to `amt-shim`

amt-shim basically lets crowd tasks be hosted on multiple platforms (MTurk, prolific, offline) through static web apps. To deploy on MTurk:
- start a new custom HIT
- paste the contents of `mturk.html-fragment` into the HTML code for the custom HIT. This tricks MTurk into thinking you're hosting on MTurk but actually you aren't
- change the `amt-shim-target` to point to wherever this directory is statically hosted
- supply the right input to load the right config files
- pay workers through bonuses (`code/tools/bonus-workers.py`)

## How to set up config

To reproduce our inputs too, copy the `study_images/configs` files into the directory `code/inputs` (you'll need to create this directory).

Then use `study_images/inputs-*.csv` as the MTurk input file. Note: You may (and probably should)
adjust the contents of this file to deploy in smaller batches. MTurk quality tends to trail off as the HITs deplete, so it is recommended that the `g-0` and `g-1` batches be deployed on separate days at the same time-of-day.

## Post-Hoc Payment and Uniqueness

Please pay workers via bonuses as described. Workers who attempt to take the HIT again will only see the last Feedback page as they have already completed the annotation once. Workers will not be able to do two different tasks of the same image type. However, it does not prevent them from actually submitting the HIT (intentionally, in case the worker encountered a network problem, their results won't be lost and they can try submitting again), which will cause you to see a duplicate result and answers to questions not associated with the right inputs.

This can be easily detected post-hoc to see if the questions the worker submitted answers to match the ones in the config they got. While this is exceedingly rare, we excluded any instances when this was detected and advise you to do so too.

We also recommend that you set up a qualification, and make the HIT only allow workers _without_ the qualification to accept. Then after each batch, use `code/tools/grant-qual.py` to grant all workers in that batch with the qualification so they cannot take a similar HIT again. While not absolutely required (it won't affect the data), this greatly reduces the incidence of problem cases where you have to reject workers who don't follow the instructions and take more than one HIT.

## Non-Turk Recruitment
If you are not recruiting on MTurk, give the hosted url (without `annotate.html`) directly to any participants.
Make sure you run `backend/apiserver.py` and change `index.html` to point to the URL of wherever you're running the backend.
Basically, the backend server acts to simulate the submit target for MTurk and "catches" the results submitted by the annotator and saves it.

