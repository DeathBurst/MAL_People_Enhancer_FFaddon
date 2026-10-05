## MAL People Page Enhancer

This Firefox add-on improves the presentation on the website [MyAnimeList](https://myanimelist.net/).
It targets voice actors' list of roles on their people page, e.g. [Rie Kugimiya's page](https://myanimelist.net/people/8/Rie_Kugimiya).

screenshots/before.png → screenshots/after.png

To install it, just download the .xpi at [this link](https://github.com/DeathBurst/MAL_People_Enhancer_FFaddon/releases/download/v1.3/mal_people_page_enhancer-1.3.0.xpi) and accept Firefox pop-up. Future versions should auto-update.

### Description 
The main goal is to avoid repeated entries in the same franchise (every season, movie, OVA, etc.) clogging the list with the same character appearing again and again.
Instead, a new table presents the different appearances grouped with a single line for each character, with their portrait, their name, and the series/franchise they are coming from indicated below their name.

> Franchise detection works based on complex heuristics and is not perfect. Please document failure cases when you find them to help me improve the heuristics.

Some minor data analysis is also performed:
- character-level classification as Main/Supporting/Mixed role, based on the entry-level data provided by MAL.
- first and latest appearance for a given character.
- actor-level count of distinct-character roles, with the fraction of Main.
- career span and duration, plus an "ongoing" indicator.
- date of first Main role, and time to first Main from career start.

The new enhanced table is sortable by clicking on the column headers. 
- Character, Franchise, and Role alternate between the classic descending and ascending orders.
- The "Role" column also offers some filters to show/hide roles by their type (Main/Mixed/Supporting).
- Other columns offer more specialised sorting orders with clickable descriptive labels.

### Future features considered:
- improved career summary above the table  
(feel free to suggest ideas)
- interaction with "My List" feature from MAL's default table  
(next version)
- similar treatment to the "Staff position" list to group together theme songs performances for the main franchise

### Version history:

- v1: basic table with sortable headers, Character, Favorites, foldable Appearances list, First and Last Appearances.
- v1.1: added character-level role classification and a short career summary above the table. The Role column acts as a filter.  
**First version with auto-updates enabled.**
- v1.2: added character-level franchise detection -> avoid opening the appearances list just to check the franchise.
- v1.3: **first version with mobile support**. Also added a few more infos to the career summary above the table itself.
- v1.4: full redesign of the UI, with less columns, grouping together info on the same topic, and much better control headers.
