import boto3, json, hashlib

MTURK_SANDBOX = 'https://mturk-requester-sandbox.us-east-1.amazonaws.com'
MTURK_PRODUCTION = 'https://mturk-requester.us-east-1.amazonaws.com'

def read_credentials(filename):
  with open(filename, 'r') as f:
    return json.load(f)

def connect(credentials, sandbox = True):
  return boto3.client('mturk',
    aws_access_key_id = credentials['AccessKey'],
    aws_secret_access_key = credentials['SecretKey'],
    region_name='us-east-1',
    endpoint_url = MTURK_SANDBOX if sandbox else MTURK_PRODUCTION)

def read_batch(filename):
  commands = []
  with open(filename, 'r') as f:
    for line in f:
      line = line.strip()
      if len(line) == 0:
        continue
      assignmentId, workerId, bonus = line.split('\t')
      # Generate a unique request token
      m = hashlib.sha1()
      m.update(f'{filename}:{workerId}:{assignmentId}:{bonus}'.encode('utf-8'))
      token = m.hexdigest()
      commands.append({
        'workerId': workerId,
        'assignmentId': assignmentId,
        'bonusAmount': bonus,
        'reason': 'Bonus',
        'uniqueRequestToken': token
      })
  return commands

def execute_batch(connection, commands, dry = False):
  for command in commands:
    if dry:
      print(f'(Dry Run) Bonus {command["bonusAmount"]} ' + \
        f'to {command["workerId"]} ' + \
        f'(unique {command["uniqueRequestToken"]})')
      continue
    try:
      resp = connection.send_bonus(
        WorkerId=command['workerId'],
        BonusAmount=command['bonusAmount'],
        AssignmentId=command['assignmentId'],
        Reason=command['reason'],
        UniqueRequestToken=command['uniqueRequestToken']
      )
      print(f'Sent bonus {command["bonusAmount"]} to {command["workerId"]}')
    except Exception as e:
      print(e)

if __name__ == '__main__':
  import sys
  if len(sys.argv) < 3:
    print(f'Usage: {sys.argv[0]} [sandbox|production] [batch_file]')
    print('    [sandbox|production] (required) specify what to use')
    print('    [batch_file] file with workers to bonus')
    exit(1)

  creds = read_credentials('credentials.json')
  print(f'(Loaded credentials)')

  sandbox = sys.argv[1] != 'production'
  print(f'Using MTurk {"SANDBOX" if sandbox else "PRODUCTION"}!')

  connection = connect(creds, sandbox = sandbox)

  commands = read_batch(sys.argv[2])
  print(f'Read {len(commands)} commands to batch execute.')

  execute_batch(connection, commands, dry = False)
