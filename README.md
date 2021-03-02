# History
History creates snapshots of a directory using hardlinks, to **preserve files which are replaced or removed**. Because the links will point to the same inode, **modified files will not be preserved**.
The script is typically run as a daily cronjob. There are **no module dependencies**, but it requires **nodejs** and **rsync** or **cp**, which means it can work on most flavours of Unix and Mac as long as the file system supports hardlinks.
## Getting started
Just grab [dist/history.js](../blob/master/dist/history.js) and run

    node history.js sourceFolder destinationFolder


## Setup cron job
This will run at 5:00PM every night

    00 05 * * * node /path/to/script/history.js sourceFolder destinationFolder

