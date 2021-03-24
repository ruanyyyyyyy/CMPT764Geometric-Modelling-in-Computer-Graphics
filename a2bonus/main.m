close all; clear; clc;

%rng default; % For reproducibility
%X = [randn(100,2)*0.75+ones(100,2)*5;
 %   randn(100,2)*0.5-ones(100,2)*5];
webdata = webread('https://www.cs.sfu.ca/~haoz/teaching/cmpt464/assign/a2/kmeans_data/gauss_data_2');
wd = strsplit(webdata, ' ');
npoints = (size(wd,2)-1)./2;
X = zeros(npoints, 2);
j = 2;
for i=1:npoints
    X(i,1) = str2num(cell2mat(wd(1,j)));
    j = j + 1;
    X(i,2) = str2num(cell2mat(wd(1,j)));
    j = j + 1;
end

k = 2;
% choose k unique random indices between 1 and size(P,2) (number of points)
randIdx = randperm(size(X,1),k);
% initial centroids
initg = X(randIdx, :);
cluster = kmeans(X, k, initg);

mua = mean(X(cluster==1,:),1);
mub = mean(X(cluster==2,:),1);
sigmaa = sum((X(cluster==1,:)-mua).^2,1);
sigmab = sum((X(cluster==2,:)-mub).^2,1);
fisher = ((sigmaa-sigmab).^2)./(sigmaa+sigmab);
scatter(X(:,1), X(:,2), 100, cluster, 'filled')
