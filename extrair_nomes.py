import os
import csv

# Caminho da pasta principal onde estão os SPCs
pasta_principal = 'spcs\\'  # <- Substituir pelo teu caminho real

# Nome do ficheiro CSV de saída
ficheiro_csv = 'nomes_spc.csv'

# Formatos de imagem válidos
formatos_validos = ('.png', '.jpg', '.jpeg', '.gif', '.bmp')

# Lista para guardar os dados
dados = []

# Percorrer todas as pastas e subpastas
for raiz, subpastas, ficheiros in os.walk(pasta_principal):
    for ficheiro in ficheiros:
        if ficheiro.lower().endswith(formatos_validos):
            caminho_relativo = os.path.relpath(os.path.join(raiz, ficheiro), pasta_principal)
            dados.append([caminho_relativo])

# Escrever no CSV
with open(ficheiro_csv, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['Caminho Relativo'])  # Cabeçalho
    writer.writerows(dados)

print(f'CSV criado com {len(dados)} ficheiros.')
