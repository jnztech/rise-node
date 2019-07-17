// tslint:disable:no-console
import { leaf } from '@carnesen/cli';
import { execCmd } from '../shared/misc';
import { IShowLogs, showLogsOption } from '../shared/options';

export default leaf({
  commandName: 'install',
  description: 'Install PostgreSQL database on Ubuntu',
  options: showLogsOption,

  async action({ show_logs }: IShowLogs) {
    try {
      const file = 'apt-get';
      const params = ['install', '-y', 'postgresql', 'postgresql-contrib'];
      const errorMsg =
        "Couldn't install PostgreSQL.\n\n" +
        "Make sure you're using `sudo`:\n" +
        '$ sudo ./rise db install\n' +
        '\n' +
        'Alternatively run the following command manually:\n' +
        `$ sudo ${file} ${params.join(' ')}`;

      await execCmd(file, params, errorMsg, null, show_logs);
    } catch {
      process.exit(1);
    }
  },
});
