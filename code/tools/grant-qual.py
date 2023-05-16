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
      commands.append({
        'workerId': workerId,
      })
  return commands

def execute_batch(connection, commands, qualId):
  for command in commands:
    try:
      resp = connection.associate_qualification_with_worker(
        QualificationTypeId = qualId,
        WorkerId = command['workerId'],
        IntegerValue = 1,
        SendNotification = False
      )
      print(f'Qualified worker {command["workerId"]} with {qualId}')
    except Exception as e:
      print(e)

if __name__ == '__main__':
  import sys
  if len(sys.argv) < 4:
    print(f'Usage: {sys.argv[0]} [sandbox|production] [batch_file] [qualId]')
    print('    [sandbox|production] (required) specify what to use')
    print('    [batch_file] file with workers to bonus')
    print('    [qualId] qualification id to allocate')
    exit(1)

  creds = read_credentials('credentials.json')
  print(f'(Loaded credentials)')

  sandbox = sys.argv[1] != 'production'
  print(f'Using MTurk {"SANDBOX" if sandbox else "PRODUCTION"}!')

  connection = connect(creds, sandbox = sandbox)

  commands = read_batch(sys.argv[2])
  print(f'Read {len(commands)} commands to batch execute.')

  execute_batch(connection, commands, sys.argv[3])
