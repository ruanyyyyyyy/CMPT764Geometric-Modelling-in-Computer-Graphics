function cluster = kmeans(x, k, initg)
    sz = size(x);
    cluster = zeros(1, sz(1));
    stop = false;
    iterations = 0;

    clusterPrev = cluster;
    
    while stop==false
         % for each data point 
        for idxP = 1:size(x,1)
            % init distance array dist
            dist = zeros(1,k);
            % compute distance to each centroid
            for idxC=1:k
                dist(idxC) = norm(x(idxP,:)-initg(idxC,:));
            end
            % find index of closest centroid (= find the cluster)
            [~, clusterP] = min(dist);
            cluster(idxP) = clusterP;
        end

        % Recompute centroids using current cluster memberships:

        % init centroid array centr
        centr = zeros(k, 2);
        % for every cluster compute new centroid
        for idxC = 1:k
            % find the points in cluster number idxC and compute row-wise mean
            centr(idxC, :) = mean(x(cluster==idxC,:),1);
        end

        % Checking for stopping criterion: Clusters do not chnage anymore
        if clusterPrev==cluster & iterations>5
            stop = true;
        end
        % update previous cluster clusterPrev
        clusterPrev = cluster;

        iterations = iterations + 1;
    end
    fprintf('iteration:%d.\n',iterations);
    
end


