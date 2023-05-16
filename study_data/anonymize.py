#!/usr/bin/env python

import glob
import hashlib
import secrets
import csv
import json
import os

"""Anonymize User Data Script"""

# Only these fields are mandatory
FIELDS = [
  'WorkerId',
  'AssignmentStatus',
  'Input.CONFIG',
  'Answer.annotations',
  'Answer.feedback'
]

def rewrite_id (id, group = 'mt', defSalt = None):
  salt = secrets.token_hex(8) if defSalt is None else defSalt
  saltedId = f'{group}:{salt}:{id}'
  return f'{group}:{salt}:{hashlib.sha256(saltedId.encode("utf-8")).hexdigest()}'

def get_salt (id):
  return id.split(':')[1]

def sanity_check(record):
  """This function handles MTurk mismatch due to taking >1 hit"""
  inputCond = record['Input.CONFIG'].split('.')[0].split('-')
  images, scale, order, group = inputCond[0], inputCond[1], inputCond[2], inputCond[4]
  if (images == 'skin' and any('/Faces/' in r['itemId'] for r in json.loads(record['Answer.annotations'])['answers'])) or \
    (images == 'face' and any('/Skin_Condition/' in r['itemId'] for r in json.loads(record['Answer.annotations'])['answers'])):
    return False
  return True

def output_records(records, outfile = 'anonymized-all.csv'):
  with open(outfile, 'w') as f:
    writer = csv.DictWriter(f, fieldnames = FIELDS)
    writer.writeheader()
    for record in records:
      output = {}
      for field in FIELDS:
        if field == 'WorkerId':
          output[field] = rewrite_id(record[field], group = record['source'])
        else:
          output[field] = record[field]
      # We also need to strip the id from the annotations
      orig_result = json.loads(output['Answer.annotations'])
      orig_result['participantId'] = output['WorkerId']
      orig_result['condition'] = record['source'] # This field records this HIT Type ID in MTurk 
      output['Answer.annotations'] = json.dumps(orig_result)
      writer.writerow(output)
  print(f'Anonymized output written to {outfile}')

def validate_records(records, reference):
  print('Preparing to validate. Any validation errors will be printed below:')
  if len(records) != len(reference):
    print(f'WARN: {len(records)} raw records but {len(reference)} anonymized!')
  # Create a salt-index
  salts = [get_salt(r['WorkerId']) for r in reference]
  ref_index = {}
  for ref in reference:
    ref_index[ref['WorkerId']] = ref
  for record in records:
    found = False
    for salt in salts:
      proposed_id = rewrite_id(record['WorkerId'], group = record['source'], defSalt = salt)
      if proposed_id in ref_index:
        found = True
        for field in FIELDS:
          if field == 'WorkerId':
            continue # Expected mismatch
          if field == 'Answer.annotations':
            input_results = json.loads(record[field])
            ref_results = json.loads(ref_index[proposed_id][field])
            for key in input_results:
              if key == 'participantId':
                continue # Expected mismatch
              elif key == 'condition':
                continue # Expected mismatch - this field records the HIT Type ID
              else: 
                if input_results[key] != ref_results[key]:
                  print(f'ERR: Mismatch on annotation results {key} for worker {proposed_id}')
            # Deep check
          if ref_index[proposed_id][field] != record[field]:
            print(f'ERR: Mismatched field {field} for {proposed_id}. Expected {ref_index[proposed_id][field]}, got {record[field]} {record["WorkerId"]}')
          break
    if not found:
      print(f'ERR: No anonymized record found for {record["WorkerId"]}')
  print('All done.')

if __name__ == '__main__':
  print('Reading input files')
  if os.path.isfile('anonymized-all.csv'):
    # Validate the anonymization
    validate_ref = []
    with open('anonymized-all.csv', 'r') as f:
      reader = csv.DictReader(f)
      for item in reader:
        validate_ref.append(item)
  else:
    validate_ref = None
  
  records = []
  for filename in glob.glob('./raw-mturk/*.csv'):
    with open(filename, 'r') as f:
      reader = csv.DictReader(f)
      for record in reader:
        if record['AssignmentStatus'] == 'Rejected':
          continue
        if not sanity_check(record):
          print(f'Rejecting record due to failing criteria.')
          continue
        canonical = {
          'source': 'mt' #mturk
        }
        for key in FIELDS:
          canonical[key] = record[key]
        records.append(canonical)

  for filename in glob.glob('./raw-nonturk/*.csv'):
    with open(filename, 'r') as f:
      reader = csv.DictReader(f)
      for record in reader:
        if record['AssignmentStatus'] == 'Rejected':
          continue
        canonical = {
          'source': 'nc' #non-crowd
        }
        for key in FIELDS:
          canonical[key] = record[key]
        records.append(canonical)
  print(f'Found a total of {len(records)} records.')
  if validate_ref is None:
    output_records(records)
  else:
    validate_records(records, validate_ref)